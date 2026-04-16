# ── 1단계: 빌드 ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 캐시 활용: package*.json 먼저 복사
COPY package*.json ./
RUN npm ci

# 소스 복사 후 빌드
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# devDependencies 제거 → production node_modules만 남기기
RUN npm prune --omit=dev

# ── 2단계: 런타임 ───────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 빌드 결과물 + production 의존성만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3000

# non-root 사용자로 실행
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

CMD ["node", "dist/main"]
