# * --- Compile Meilisearch from source ---
FROM getmeili/meilisearch:v0.27.0 as meilisearch 

RUN cp /bin/meilisearch /home/meilisearch

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

RUN apk add --no-cache bash curl libgcc

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

COPY ops/setup.ts .
COPY tsconfig.json .
COPY data data

COPY --from=meilisearch /home/meilisearch meilisearch

RUN chmod 747 ./meilisearch
RUN pnpm ts-node setup.ts

# * ====================
FROM node:16-alpine3.14

WORKDIR /usr/app/

RUN apk add --no-cache bash curl libgcc

COPY --from=modules /usr/app/node_modules node_modules
COPY --from=builder /usr/app/build build
COPY --from=meilisearch /home/meilisearch meilisearch
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
