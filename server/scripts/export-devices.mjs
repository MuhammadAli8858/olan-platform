// ══════════════════════════════════════════════════════════════════
// ВЫГРУЗКА КАТАЛОГА В ЗАПАСНЫЕ ДАННЫЕ САЙТА
//
// Сайт берёт содержимое с сервера. Если сервер недоступен, он
// показывает встроенный запасной вариант — чтобы посетитель видел
// рабочий сайт, а не пустой экран.
//
// Этот скрипт переносит каталог комплексов из seed-devices.js
// в site-client/src/app/data/devices.generated.ts.
//
// Запуск из папки site-client: npm run sync:devices
// Запускать после правки server/src/seed-devices.js.
// ══════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedContent } from "../src/seed-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dirname, "..", "..", "site-client", "src", "app", "data", "devices.generated.ts");

const ru = seedContent().ru;
const out = {};
for (const [id, s] of Object.entries(ru.solutions || {})) {
  out[id] = {
    devices: s.devices || [],
    catalogTitle: s.catalogTitle,
    catalogLead: s.catalogLead,
    sellText: s.sellText,
    solutionTitle: s.solutionTitle,
  };
}

const header = `// ══════════════════════════════════════════════════════════════════
// КАТАЛОГ КОМПЛЕКСОВ — ЗАПАСНОЙ ВАРИАНТ
//
// Этот файл СОЗДАЁТСЯ АВТОМАТИЧЕСКИ из server/src/seed-devices.js
// командой: npm run sync:devices
// Править его вручную не нужно — изменения перезапишутся.
//
// Нужен для одного случая: сервер недоступен, содержимое из
// админ-панели не загрузилось. Тогда сайт показывает каталог
// отсюда, а не пустой экран.
// ══════════════════════════════════════════════════════════════════

export const fallbackDevices = `;

fs.writeFileSync(TARGET, header + JSON.stringify(out, null, 2) + " as const;\n", "utf8");
console.log(`✓ devices.generated.ts — решений: ${Object.keys(out).length}`);
