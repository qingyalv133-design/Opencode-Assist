FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g @opencode/cli@2.1.4

WORKDIR /app
COPY deploy/app-dist ./dist
COPY deploy/public-proxy.mjs ./public-proxy.mjs
COPY deploy/opencode.jsonc ./opencode.jsonc
COPY deploy/models.json ./models.json
COPY deploy/start.sh ./start.sh

ENV ASSIST_DIST=/app/dist
ENV OPENCODE_PASSWORD=opencode12345
EXPOSE 8080
CMD ["bash", "/app/start.sh"]
