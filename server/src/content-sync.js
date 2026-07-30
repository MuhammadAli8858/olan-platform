// ══════════════════════════════════════════════════════════════════
// СИНХРОНИЗАЦИЯ СОДЕРЖИМОГО ПО ВСЕМ 9 ЯЗЫКАМ
//
// Правило простое:
//   • Структура (какие есть проблемы, партнёры, проекты, страны,
//     их порядок, коды, иконки, координаты, логотипы) —
//     ВСЕГДА одинаковая на всех языках. Добавили проблему на русском —
//     она появилась во всех девяти.
//
//   • Тексты — переводятся или копируются, НО:
//     если админ уже перевёл поле вручную на каком-то языке,
//     его перевод сохраняется и не затирается.
//     Как это определяется: сервер помнит, какой текст был в исходном
//     языке в момент прошлой синхронизации. Если текст на другом языке
//     совпадает с той старой версией — значит его никто не трогал,
//     можно обновлять. Если отличается — это ручной перевод, не трогаем.
//
//   • Кнопка «Перевести всё заново» в панели включает режим force —
//     тогда перезаписывается всё, включая ручные правки.
// ══════════════════════════════════════════════════════════════════

import { translateBatch } from "./translate.js";

/**
 * Какие поля переводить.
 * Ключ — «путь» внутри содержимого, звёздочка = любой элемент списка.
 * Всё, чего здесь нет (коды, иконки, ISO, координаты, логотипы,
 * номера машин, цифры, названия продуктов) копируется без изменений —
 * такие значения одинаковы на всех языках.
 */
const TRANSLATABLE = [
  "company.about",
  "company.address",
  "company.statusLine",
  "hero.badge",
  "hero.titleLine1",
  "hero.titleAccent",
  "hero.titleLine3",
  "hero.lead",
  "stats.*.label",
  "processSteps.*.title",
  "processSteps.*.desc",
  "detections.*.type",
  "problems.*.title",
  "problems.*.short",
  "solutions.*.heroAccent",
  "solutions.*.heroRest",
  "solutions.*.heroLead",
  "solutions.*.solutionTitle",
  "solutions.*.sellText",
  "solutions.*.ctaLine",
  "solutions.*.stats.*.fact",
  "solutions.*.stats.*.source",
  "solutions.*.features.*.title",
  "solutions.*.features.*.desc",
  "solutions.*.specs.*.k",
  "solutions.*.specs.*.v",
  "solutions.*.results.*.label",
  "countries.*.name",
  "projectMarkers.*.name",
  "projects.*.country",
  "projects.*.city",
  "projects.*.title",
  "projects.*.desc",
  "projects.*.metrics.*.l",
  "partners.*.tag",
  "partners.*.description",
];

/** Подходит ли путь под шаблон со звёздочками */
function matches(path, pattern) {
  const p = path.split(".");
  const t = pattern.split(".");
  if (p.length !== t.length) return false;
  return t.every((seg, i) => seg === "*" || seg === p[i]);
}

function isTranslatable(path) {
  return TRANSLATABLE.some((pattern) => matches(path, pattern));
}

/** Собрать все переводимые строки объекта: [{ path, value }] */
export function collect(obj, prefix = "", out = []) {
  if (obj === null || obj === undefined) return out;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collect(item, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      collect(value, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  if (typeof obj === "string" && obj.trim() && isTranslatable(prefix)) {
    out.push({ path: prefix, value: obj });
  }
  return out;
}

/** Прочитать значение по пути "a.b.0.c" */
export function get(obj, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

/** Записать значение по пути */
function set(obj, path, value) {
  const keys = path.split(".");
  let node = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] == null) return;
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
}

/**
 * Разнести содержимое исходного языка по всем остальным.
 *
 * @param {object} content   — весь объект { ru: {...}, uz: {...}, ... }
 * @param {object} snapshots — прошлые снимки исходного языка по языкам
 * @param {string} sourceLang— язык, который редактировали
 * @param {string[]} langs   — все языки платформы
 * @param {boolean} force    — true = перезаписать даже ручные переводы
 * @returns {{ content, snapshots, report }}
 */
/**
 * mode:
 *   "sync" — обычная синхронизация после правки исходника
 *   "fill" — ДОЗАПОЛНЕНИЕ: переводятся только поля, которые остались
 *            равны русскому исходнику (то есть непереведённые).
 *            Всё, что уже отличается от русского — не трогается.
 *            Безопасно запускать сколько угодно раз.
 */
export async function syncAllLanguages(content, snapshots, sourceLang, langs, force = false, mode = "sync") {
  const source = content[sourceLang];
  if (!source) throw new Error("Нет содержимого исходного языка");

  const sourceStrings = collect(source);
  const report = {};

  for (const lang of langs) {
    if (lang === sourceLang) continue;

    const prev = content[lang]; // что сейчас на этом языке

    // Снимки прошлой синхронизации:
    //   snap.src — каким был ИСХОДНИК в прошлый раз (чтобы понять, что менялось)
    //   snap.out — что ЗАПИСАЛ переводчик в прошлый раз (чтобы отличить
    //              машинный перевод от ручной правки администратора)
    let snap = snapshots?.[lang];
    if (snap && !snap.src) snap = { src: snap, out: null }; // старый формат снимка

    const target = structuredClone(source); // структура всегда как в исходнике
    const toTranslate = [];
    let kept = 0;      // сохранено ручных переводов
    let unchanged = 0; // не переводилось повторно (исходник не менялся)

    for (const { path, value } of sourceStrings) {
      const prevValue = prev ? get(prev, path) : undefined;
      const prevSource = snap?.src ? get(snap.src, path) : undefined;
      const prevOutput = snap?.out ? get(snap.out, path) : undefined;

      // Режим дозаполнения: переводим только то, что совпадает
      // с русским исходником (значит, не переведено). Остальное не трогаем.
      if (mode === "fill") {
        if (prevValue === undefined || prevValue === value) {
          toTranslate.push({ path, value });
        } else {
          set(target, path, prevValue);
          kept++;
        }
        continue;
      }

      // Ручная правка: текст на этом языке отличается от того,
      // что записала прошлая синхронизация
      const manual =
        !force &&
        typeof prevValue === "string" &&
        prevValue.trim() &&
        (prevOutput !== undefined ? prevValue !== prevOutput : prevValue !== prevSource);

      if (manual) {
        set(target, path, prevValue); // бережём ручной перевод
        kept++;
        continue;
      }

      // Исходник этого поля не менялся — оставляем прошлый перевод,
      // не гоняем переводчик впустую
      if (!force && prevValue !== undefined && value === prevSource) {
        set(target, path, prevValue);
        unchanged++;
        continue;
      }

      toTranslate.push({ path, value });
    }

    // Переводим одним пакетом (или копируем, если перевод отключён)
    if (toTranslate.length) {
      const translated = await translateBatch(
        toTranslate.map((x) => x.value),
        sourceLang,
        lang
      );
      toTranslate.forEach((item, i) => set(target, item.path, translated[i] ?? item.value));
    }

    // Снимок «что записал переводчик»: для ручных полей сохраняем
    // ПРОШЛОЕ машинное значение, чтобы ручная правка распознавалась и дальше
    const out = structuredClone(target);
    if (!force && mode !== "fill") {
      for (const { path } of sourceStrings) {
        const prevValue = prev ? get(prev, path) : undefined;
        const prevSource = snap?.src ? get(snap.src, path) : undefined;
        const prevOutput = snap?.out ? get(snap.out, path) : undefined;
        const wasManual =
          typeof prevValue === "string" &&
          prevValue.trim() &&
          (prevOutput !== undefined ? prevValue !== prevOutput : prevValue !== prevSource);
        if (wasManual) set(out, path, prevOutput ?? prevSource ?? "");
      }
    }

    content[lang] = target;
    snapshots[lang] = { src: structuredClone(source), out };
    report[lang] = { updated: toTranslate.length, keptManual: kept, skipped: unchanged };
  }

  snapshots[sourceLang] = { src: structuredClone(source), out: null };

  return { content, snapshots, report };
}
