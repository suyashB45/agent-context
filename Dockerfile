FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY web ./web
COPY scripts/build.mjs ./scripts/build.mjs
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    AGENT_CONTEXT_DB=/data/context.sqlite3 \
    AGENT_CONTEXT_HOST=0.0.0.0
WORKDIR /app
RUN groupadd --gid 10001 agentcontext \
    && useradd --uid 10001 --gid 10001 --no-create-home agentcontext \
    && mkdir /data && chown 10001:10001 /data
COPY --from=build /app/build/npm ./build/npm
COPY bin ./bin
COPY LICENSE ./LICENSE
USER 10001:10001
EXPOSE 8765
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:8765/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "/app/bin/agent-context.mjs"]
