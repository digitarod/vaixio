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

EXPOSE 3000
CMD ["npm", "start"]
