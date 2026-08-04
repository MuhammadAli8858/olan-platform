// ══════════════════════════════════════════════════════════════════
// АДРЕСА СТРАНИЦ
//
// Раньше весь сайт жил по одному адресу «/»: страница выбиралась
// только состоянием React. Из-за этого нельзя было отправить ссылку
// на конкретное решение, поисковики видели одну страницу, а в
// мессенджерах у всех ссылок было одинаковое превью.
//
// Теперь у каждой страницы свой адрес:
//   /                              — главная на языке по умолчанию
//   /ru/                           — главная на русском
//   /en/solutions/solution-speeding— решение на английском
//
// Язык стоит в начале пути: так поисковики понимают, что это
// разные языковые версии, а не дубли одной страницы.
// ══════════════════════════════════════════════════════════════════

import { LANGUAGES, type LangCode } from "../i18n/locales";

export const DEFAULT_LANG: LangCode = "ru";

/** Базовый адрес сайта — нужен для canonical и OG-тегов */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://olanhightech.com"
).replace(/\/+$/, "");

export type Route = { lang: LangCode; page: string }; // page: "home" | id проблемы

const isLang = (v: string): v is LangCode => LANGUAGES.some((l) => l.code === v);

/** Разобрать адрес в браузере: "/en/solutions/solution-speeding" → { lang, page } */
export function parsePath(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);

  let lang: LangCode | null = null;
  if (parts.length && isLang(parts[0])) lang = parts.shift() as LangCode;

  // /solutions/<id> либо просто /<id> — принимаем оба варианта
  if (parts[0] === "solutions") parts.shift();
  const page = parts[0] || "home";

  return { lang: lang ?? detectLang(), page };
}

/** Собрать адрес: { lang: "en", page: "solution-speeding" } → "/en/solutions/solution-speeding" */
export function buildPath(lang: LangCode, page: string): string {
  if (page === "home") return `/${lang}/`;
  return `/${lang}/solutions/${page}`;
}

/** Язык по сохранённому выбору или настройкам браузера */
export function detectLang(): LangCode {
  try {
    const saved = localStorage.getItem("oht-lang") as LangCode;
    if (saved && isLang(saved)) return saved;
    const nav = navigator.language.slice(0, 2);
    if (isLang(nav)) return nav;
  } catch { /* локальное хранилище недоступно */ }
  return DEFAULT_LANG;
}

/** Текущий маршрут (на сервере при пререндере window нет) */
export function currentRoute(): Route {
  if (typeof window === "undefined") return { lang: DEFAULT_LANG, page: "home" };
  return parsePath(window.location.pathname);
}
