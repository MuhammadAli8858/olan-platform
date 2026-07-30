#!/bin/bash
# Установка зависимостей всех четырёх приложений
set -e
cd "$(dirname "$0")"
for d in server site-client portal-staff admin-panel; do
  echo "▶ Установка: $d"
  (cd "$d" && npm install)
done
echo "✓ Готово. Запуск: ./start-all.sh"
