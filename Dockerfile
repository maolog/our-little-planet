# syntax=docker/dockerfile:1
# 多阶段构建：构建产物用 Next.js standalone 输出（见 next.config.ts 的 output: "standalone"），
# 运行镜像只带运行时必需的文件 + ffmpeg，不装整份 node_modules。

# ───────────────────────── 构建阶段 ─────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# better-sqlite3 / sharp 没有匹配的预编译包时回退到源码编译
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# public 目录目前不存在，先补一个空目录，将来加了静态文件也能被带进镜像
RUN mkdir -p public

# NEXT_PUBLIC_* 会在构建期内联进客户端包，必须用 build args 传入（compose 会自动从 .env 读）
ARG NEXT_PUBLIC_READER_NAME=
ARG NEXT_PUBLIC_DEMO_MODE=
ENV NEXT_PUBLIC_READER_NAME=$NEXT_PUBLIC_READER_NAME \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ───────────────────────── 运行阶段 ─────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Shanghai \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# ffmpeg：读视频/录音时长、抽视频封面（与 README「推荐装上 ffmpeg」一致）
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 数据目录：journal.db + media/，由 compose 挂卷持久化。
# 官方 node 镜像自带 node 用户（uid 1000），以非 root 运行；
# 整个 /app 交给 node：Next 运行期还会往 .next/cache 写缓存
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3000

# 3xx/4xx 都算健康（首页可能 302 到锁页），只有 5xx 或连不上才失败
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# tini：正确转发信号，容器 stop 时进程能干净退出
CMD ["tini", "--", "node", "server.js"]
