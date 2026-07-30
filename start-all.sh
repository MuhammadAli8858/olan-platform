#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Запуск всей платформы одной командой (Linux / macOS)
# Откроются: сервер :4000, сайт :5173, кабинеты :5174, админка :5175
# Остановить всё — Ctrl+C
# ═══════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

echo "▶ Запуск сервера…"
(cd server && npm start) &
sleep 2
echo "▶ Запуск главного сайта…"
(cd site-client && npm run dev) &
echo "▶ Запуск кабинетов…"
(cd portal-staff && npm run dev) &
echo "▶ Запуск админ-панели…"
(cd admin-panel && npm run dev) &

echo ""
echo "  Главный сайт    → http://localhost:5173"
echo "  Кабинеты        → http://localhost:5174"
echo "  Админ-панель    → http://localhost:5175"
echo ""
wait
