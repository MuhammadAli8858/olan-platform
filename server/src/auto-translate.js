// ══════════════════════════════════════════════════════════════════
// АВТОМАТИЧЕСКИЙ ДОПЕРЕВОД ПРИ ЗАПУСКЕ СЕРВЕРА
//
// Через пару секунд после старта сервер сам проверяет: остались ли
// на каких-то языках тексты, совпадающие с русским исходником
// (то есть непереведённые). Если остались — тихо допереводит их
// в фоне, не мешая работе сайта.
//
// Что важно:
//  • трогаются ТОЛЬКО непереведённые поля — всё, что уже переведено
//    (автоматически или вручную), остаётся как есть;
//  • если интернета нет или переводчик недоступен — ничего не
//    ломается, сервер просто попробует снова при следующем запуске;
//  • ход работы виден в консоли сервера.
// ══════════════════════════════════════════════════════════════════

import db from "./db.js";
import { LANGS } from "./seed-content.js";
import { syncAllLanguages, collect, get } from "./content-sync.js";
import { translationEnabled } from "./translate.js";
import { TRANSLATE } from "./config.js";

/**
 * Сосчитать непереведённые строки языка: смотрим только ПЕРЕВОДИМЫЕ
 * поля (тот же список, что использует синхронизация) и считаем те,
 * что до сих пор равны русскому исходнику.
 */
function countUntranslated(content, lang) {
  const cur = content[lang];
  if (!cur) return Infinity;
  const ruStrings = collect(content.ru);
  return ruStrings.filter(
    ({ path, value }) => get(cur, path) === value && /[А-Яа-яЁё]/.test(value)
  ).length;
}

let running = false;

/** Проверить и допереводить, если нужно. Вызывается при старте сервера. */
export async function autoTranslateIfNeeded() {
  if (running) return;
  if (!translationEnabled()) return; // переводчик выключен (provider: none)

  const data = db.read();
  if (!data.content?.ru) return;

  const pending = LANGS.filter((l) => l !== "ru" && countUntranslated(data.content, l) > 0);
  if (!pending.length) return;

  running = true;
  console.log("");
  console.log(`  [автоперевод] найдены непереведённые тексты: ${pending.join(", ").toUpperCase()}`);
  console.log(`  [автоперевод] допереводим в фоне (${TRANSLATE.provider})…`);

  try {
    if (!data.snapshots) data.snapshots = {};

    // Делаем до трёх проходов: переводчик может не осилить всё за раз
    // (ограничение по частоте запросов, обрыв связи). Каждый проход
    // берёт только то, что осталось. Останавливаемся, когда прогресса
    // больше нет — чтобы не крутиться впустую.
    let prevLeft = Infinity;
    for (let pass = 1; pass <= 3; pass++) {
      const result = await syncAllLanguages(
        data.content, data.snapshots, "ru", LANGS, false, "fill"
      );
      data.content = result.content;
      data.snapshots = result.snapshots;
      db.write();

      const left = LANGS.filter((l) => l !== "ru")
        .reduce((n, l) => n + countUntranslated(data.content, l), 0);

      for (const lang of pending) {
        const r = result.report[lang];
        if (r?.updated) {
          const tail = r.failed ? `, не поддалось ${r.failed}` : "";
          console.log(`  [автоперевод] проход ${pass} · ${lang.toUpperCase()}: переведено ${r.updated}${tail}`);
        }
      }

      if (left === 0) break;
      if (left >= prevLeft) {
        console.warn(`  [автоперевод] осталось непереведённым строк: ${left}. Переводчик больше не отвечает — допереведите позже кнопкой в админ-панели.`);
        break;
      }
      prevLeft = left;
    }

    const remain = LANGS.filter((l) => l !== "ru")
      .map((l) => [l, countUntranslated(data.content, l)])
      .filter(([, n]) => n > 0);

    if (remain.length) {
      console.log(`  [автоперевод] осталось: ${remain.map(([l, n]) => `${l.toUpperCase()} ${n}`).join(", ")}`);
    } else {
      console.log("  [автоперевод] готово — переведено всё");
    }
  } catch (err) {
    console.warn(`  [автоперевод] не удалось: ${err.message}. Попробуем при следующем запуске.`);
  } finally {
    running = false;
  }
}
