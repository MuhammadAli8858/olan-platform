#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# РЕЗЕРВНАЯ КОПИЯ
# Сохраняет базу (тексты сайта, сотрудники, переписка) и логотипы.
# Поставьте в расписание:  crontab -e
#   0 3 * * * /путь/к/olan-platform/deploy/backup.sh
# ══════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

DEST="./backups"
STAMP=$(date +%Y-%m-%d_%H-%M)
mkdir -p "$DEST"

tar czf "$DEST/olan-backup-$STAMP.tar.gz" data/db data/uploads
echo "✓ Копия создана: $DEST/olan-backup-$STAMP.tar.gz"

# храним копии за последние 30 дней
find "$DEST" -name "olan-backup-*.tar.gz" -mtime +30 -delete
