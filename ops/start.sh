#!/bin/bash
./meilisearch > /dev/null 2>&1 &

./node_modules/pm2/bin/pm2-runtime build

# ./parallel.sh "varnishd \
#     -f /etc/varnish/default.vcl \
#     -a :8082 \
#     -T localhost:6082 \
#     -s malloc,256m \
#     -t 10800" \
#     "nginx -c /etc/nginx/conf.d/default.conf" \
#     "./meilisearch" > /dev/null 2>&1 &

# node build
