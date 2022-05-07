# * --- Compile Meilisearch from source ---
FROM rust:alpine3.14 AS compiler
RUN apk add -q --update-cache --no-cache build-base openssl-dev git

WORKDIR /

RUN git clone https://github.com/meilisearch/meilisearch

WORKDIR /meilisearch

ARG COMMIT_SHA
ARG COMMIT_DATE
ENV COMMIT_SHA=${COMMIT_SHA} COMMIT_DATE=${COMMIT_DATE}
ENV RUSTFLAGS="-C target-feature=-crt-static"

RUN     set -eux; \
        apkArch="$(apk --print-arch)"; \
        if [ "$apkArch" = "aarch64" ]; then \
            export JEMALLOC_SYS_WITH_LG_PAGE=16; \
        fi && \
        cargo build --release

# * --- Node Builder
FROM node:16-alpine3.14 as builder

WORKDIR /usr/app

RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# * ====================
FROM node:16-alpine3.14 as modules

WORKDIR /usr/app

RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile --production
RUN pnpm prune --production

# * ====================
FROM node:16-alpine3.14 as search-index

WORKDIR /usr/app

RUN apk add --no-cache bash curl libgcc

RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile

COPY setup.ts .
COPY tsconfig.json .
COPY data data

COPY --from=compiler /meilisearch/target/release/meilisearch meilisearch

RUN chmod 777 ./meilisearch

RUN pnpm ts-node setup.ts

# * ====================
FROM node:16-alpine3.14 as main

WORKDIR /usr/app/

RUN apk add --no-cache bash curl libgcc

COPY --from=modules /usr/app/node_modules node_modules
COPY --from=builder /usr/app/build build
COPY --from=compiler /meilisearch/target/release/meilisearch meilisearch
COPY --from=search-index /usr/app/data.ms data.ms
COPY package.json .

# COPY ./ops/varnish /etc/default/varnish
# COPY ./ops/default.vcl /etc/varnish/default.vcl
# COPY ./ops/default.conf /etc/nginx/conf.d/default.conf
COPY ./ops/parallel.sh .
COPY ./ops/start.sh .

RUN chmod 555 ./meilisearch

ENV NODE_ENV production

EXPOSE 8080

CMD ["/bin/bash", "./start.sh"]
