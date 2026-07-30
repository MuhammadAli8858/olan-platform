# ═══════════════════════════════════════════════════════════════
# Сборка сайта и раздача через nginx
# Адрес сервера подставляется на этапе сборки (VITE_API_URL)
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# адрес API вшивается в сборку
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── раздача готовых файлов ───
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
