// ══════════════════════════════════════════════════════════════════
// ХРАНИЛИЩЕ ДАННЫХ
// Все данные платформы лежат в одном файле data/db.json:
//   managers  — менеджеры (создаёт админ)
//   operators — операторы (создаёт менеджер или админ)
//   chats     — переписки с клиентами сайта
//   leads     — заявки с формы «Запросить консультацию»
//   content   — редактируемое содержимое сайта (CMS, по языкам)
//   snapshots — служебные снимки для синхронизации переводов
//
// Для боевой нагрузки замените на PostgreSQL/MongoDB —
// интерфейс функций ниже останется тем же.
// ══════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedContent, LANGS } from "./seed-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY = {
  managers: [],
  operators: [],
  chats: [],
  leads: [],
  content: null,
  // снимки исходных текстов — нужны, чтобы при синхронизации языков
  // не затирать переводы, сделанные вручную
  snapshots: {},
};

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Прочитать всю базу */
export function read() {
  if (cache) return cache;
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    cache = { ...EMPTY, content: seedContent() };
    write();
    return cache;
  }
  try {
    cache = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    // подстраховка: если файл старой версии — добавим недостающие поля
    for (const k of Object.keys(EMPTY)) if (cache[k] === undefined) cache[k] = EMPTY[k];
    if (!cache.content) cache.content = seedContent();

    // ── Автоматическое обновление переводов ──
    // Если база создана старой версией (когда переводов ещё не было),
    // некоторые языки могут быть пустыми (null) или содержать русский
    // текст. Дозаполняем их готовыми переводами — но НЕ трогаем русский
    // и не затираем то, что администратор уже отредактировал вручную.
    const fresh = seedContent();
    let migrated = false;

    // ── Список языков изменился ──
    // Если из платформы убрали язык (или добавили новый), приводим базу
    // в соответствие: лишние языки удаляем, недостающие — создаём.
    // Русский остаётся всегда, он исходный.
    const removed = Object.keys(cache.content).filter((l) => !LANGS.includes(l));
    for (const lang of removed) {
      delete cache.content[lang];
      if (cache.snapshots) delete cache.snapshots[lang];
      migrated = true;
    }
    if (removed.length) {
      console.log(`  [миграция] языки удалены из базы: ${removed.join(", ")}`);
    }

    for (const lang of Object.keys(fresh)) {
      if (lang === "ru") continue;
      // язык пуст — заполняем переводом
      if (!cache.content[lang]) {
        cache.content[lang] = fresh[lang];
        migrated = true;
        continue;
      }
      // язык есть, но его главный экран совпадает с русским
      // (значит перевод не подставился в старой версии) — обновляем
      const cur = cache.content[lang];
      const ru = cache.content.ru;
      if (cur?.hero?.titleAccent && ru?.hero?.titleAccent &&
          cur.hero.titleAccent === ru.hero.titleAccent &&
          fresh[lang]?.hero?.titleAccent !== ru.hero.titleAccent) {
        // переносим переводы главного экрана, компании и названий проблем,
        // сохраняя остальную структуру (проекты, партнёры и т.д.)
        cur.hero = fresh[lang].hero;
        if (cur.company) {
          cur.company.about = fresh[lang].company.about;
          cur.company.statusLine = fresh[lang].company.statusLine;
        }
        if (Array.isArray(cur.problems)) {
          for (const p of cur.problems) {
            const tr = fresh[lang].problems?.find((x) => x.code === p.code);
            if (tr) { p.title = tr.title; p.short = tr.short; }
            // заголовок страницы решения: если он остался русским —
            // подставляем переведённое название проблемы
            const sol = cur.solutions?.[p.id];
            const ruSol = ru.solutions?.[p.id];
            if (sol && ruSol &&
                sol.heroRest === ruSol.heroRest &&
                sol.heroAccent === ruSol.heroAccent) {
              sol.heroRest = p.title;
              sol.heroAccent = "";
            }
          }
        }
        migrated = true;
      }
    }
    if (migrated) {
      write();
      console.log("  [миграция] переводы языков обновлены в существующей базе");
    }

    // ── Операторы без менеджера ──
    // В старых версиях оператор мог создаться без менеджера (managerId: null)
    // и «терялся» в интерфейсе. Привязываем таких к первому менеджеру,
    // чтобы они снова стали видны и управляемы.
    if (cache.managers.length) {
      let fixed = false;
      for (const op of cache.operators) {
        if (!op.managerId || !cache.managers.some((m) => m.id === op.managerId)) {
          op.managerId = cache.managers[0].id;
          fixed = true;
        }
      }
      if (fixed) {
        write();
        console.log("  [миграция] операторы без менеджера привязаны к первому менеджеру");
      }
    }
  } catch {
    cache = { ...EMPTY, content: seedContent() };
  }
  return cache;
}

/** Сохранить базу на диск */
export function write() {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), "utf8");
}

/** Изменить базу: db.update(d => { d.leads.push(...) }) */
export function update(fn) {
  const db = read();
  const result = fn(db);
  write();
  return result;
}

export default { read, write, update };
