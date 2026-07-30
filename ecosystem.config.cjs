// ══════════════════════════════════════════════════════════════════
// ЗАПУСК БЕЗ DOCKER — через PM2
//
// Вариант для тех, у кого на сервере уже стоит nginx и Node.js.
//
//   npm install -g pm2
//   cd server && npm install --omit=dev && cd ..
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup     ← автозапуск после перезагрузки сервера
//
// Сайты при этом собираются один раз и раздаются вашим nginx:
//   cd site-client  && VITE_API_URL=https://api.вашдомен npm run build
//   cd portal-staff && VITE_API_URL=https://api.вашдомен npm run build
//   cd admin-panel  && VITE_API_URL=https://api.вашдомен npm run build
// Готовые файлы появятся в папках dist/ — их и раздаёт nginx.
// ══════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: "olan-server",
      cwd: "./server",
      script: "src/index.js",
      instances: 1,           // чат хранит соединения — только один процесс
      exec_mode: "fork",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 4000,

        // ⚠️ Замените на свои значения
        ADMIN_EMAIL: "admin@olanhightech.com",
        ADMIN_PASSWORD: "ЗАМЕНИТЕ_НА_СЛОЖНЫЙ_ПАРОЛЬ",
        JWT_SECRET: "ЗАМЕНИТЕ_НА_СЛУЧАЙНУЮ_СТРОКУ",

        ALLOWED_ORIGINS: "https://olanhightech.com,https://portal.olanhightech.com,https://admin.olanhightech.com",

        TRANSLATE_PROVIDER: "none",
        TRANSLATE_API_KEY: "",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      time: true,
    },
  ],
};
