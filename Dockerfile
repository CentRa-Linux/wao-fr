# ビルドステージ
FROM node:22-alpine AS builder

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json package-lock.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# ビルド時の環境変数
ARG VITE_API_URL=https://wao-api.centraworks.net
ARG VITE_TURNSTILE_SITE_KEY=0x4AAAAAACDfp-3aa3KQ0l-7
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# ビルド
RUN npm run build

# 実行ステージ（nginx で静的ファイルを配信）
FROM nginx:alpine

# nginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
