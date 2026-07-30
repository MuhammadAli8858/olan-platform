// ══════════════════════════════════════════════════════════════════
// КОМАНДА ПОЛНОГО ПЕРЕВОДА САЙТА
//
// Переводит ВСЁ содержимое сайта с русского на остальные 8 языков:
// заголовки, подводки, продающие тексты решений, факты, преимущества,
// техпаспорта, результаты, проекты, партнёров — всё сразу.
//
// Запуск (из папки server):
//     npm run translate
//
// Что важно знать:
//  • используется переводчик из config.js (по умолчанию google-free —
//    бесплатный, без ключа, нужен только интернет);
//  • команда перезаписывает ПЕРЕВОДЫ на всех языках, кроме русского —
//    русский исходник не трогается никогда;
//  • перевод ~400 полей на 8 языков занимает несколько минут —
//    это нормально, на экране виден ход работы;
//  • та же самая операция доступна в админ-панели —
//    кнопка «Перевести всё заново».
//
// После этой команды любые правки админа будут автоматически
// переводиться при сохранении (это уже встроено в сервер).
// ══════════════════════════════════════════════════════════════════

import db from "./db.js";
import { LANGS } from "./seed-content.js";
import { syncAllLanguages } from "./content-sync.js";
import { TRANSLATE } from "./config.js";
import { translationEnabled } from "./translate.js";

const started = Date.now();

console.log("");
console.log("  ╔══════════════════════════════════════════════════╗");
console.log("  ║   OLAN HIGH TECH — перевод сайта на 9 языков     ║");
console.log("  ╚══════════════════════════════════════════════════╝");
console.log(`  Переводчик: ${TRANSLATE.provider}`);

if (!translationEnabled()) {
  console.log("");
  console.log("  ⚠ Переводчик выключен (provider = none):");
  console.log("    тексты будут СКОПИРОВАНЫ на все языки без перевода.");
  console.log("    Чтобы переводить автоматически, укажите в src/config.js");
  console.log('    provider: "google-free" (бесплатно, без ключа).');
}

const data = db.read();
if (!data.content?.ru) {
  console.error("  ✗ В базе нет русского содержимого. Запустите сначала сервер.");
  process.exit(1);
}
if (!data.snapshots) data.snapshots = {};

console.log("");
console.log("  Идёт перевод — это займёт несколько минут…");
console.log("");

try {
  const result = await syncAllLanguages(
    data.content,
    data.snapshots,
    "ru",
    LANGS,
    true // force: перезаписать все переводы заново
  );
  data.content = result.content;
  data.snapshots = result.snapshots;
  db.write();

  for (const [lang, r] of Object.entries(result.report)) {
    console.log(`   ✓ ${lang.toUpperCase()}: переведено полей — ${r.updated}`);
  }
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log("");
  console.log(`  ✅ Готово за ${seconds} сек. Обновите страницу сайта и проверьте языки.`);
  console.log("     Точечные правки можно вносить в админ-панели —");
  console.log("     при сохранении они переведутся автоматически.");
} catch (err) {
  console.error("  ✗ Ошибка перевода:", err.message);
  console.error("    Проверьте подключение к интернету и попробуйте ещё раз.");
  process.exit(1);
}
