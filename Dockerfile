# web/ (ダッシュボードSPA) のビルド専用ステージ。本番イメージには成果物(dist)のみ含める。
FROM node:20-slim AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# core/connectors/interfaces/customers のみが実行に必要（tsx がソースを直接実行する）。
# §4: コネクタフォルダを増やすには connectors/ を差し替えて再起動するだけでよい。
COPY core ./core
COPY connectors ./connectors
COPY interfaces ./interfaces
COPY customers ./customers
COPY --from=web-build /app/web/dist ./web/dist

EXPOSE 3000
CMD ["npm", "start"]
