# Standalone HLS video proxy (stream-server.js). Build from the repository root:
#   docker build -f deploy/stream-proxy/Dockerfile -t animeverse-stream .
# Run (put Caddy or another TLS proxy in front, see the README):
#   docker run -d --name animeverse-stream --restart unless-stopped \
#     -p 127.0.0.1:8080:8080 -e ALLOWED_ORIGINS=https://watchanimeverse.dpdns.org \
#     animeverse-stream
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# The proxy needs only its entry point and the stream services.
COPY stream-server.js ./
COPY src/services ./src/services

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "stream-server.js"]
