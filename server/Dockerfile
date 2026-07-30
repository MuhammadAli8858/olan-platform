# ═══════════════════════════════════════════════════════════════
# Образ сервера: API, онлайн-чат, база, загрузка файлов
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine

WORKDIR /app

# сначала зависимости — так пересборка идёт быстрее
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

# папки для базы и загруженных логотипов (подключаются томами)
RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
EXPOSE 4000

# проверка живости для docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/api/content?lang=ru > /dev/null || exit 1

CMD ["node", "src/index.js"]
