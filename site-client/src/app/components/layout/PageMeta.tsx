// ══════════════════════════════════════════════════════════════════
// ЗАГОЛОВОК СТРАНИЦЫ И ТЕГИ ДЛЯ ПРЕВЬЮ ССЫЛОК
//
// Обновляет при каждом переходе:
//   • <title> и описание — для вкладки браузера и поиска
//   • OG- и Twitter-теги — превью ссылки в Telegram, WhatsApp,
//     LinkedIn и почте (критично для деловой переписки)
//   • canonical — какой адрес считать основным
//   • hreflang — какие ещё языковые версии существуют
//
// Важно: мессенджеры НЕ выполняют JavaScript — они читают теги
// из готового HTML. Поэтому теги ниже нужны для навигации внутри
// сайта, а для первого запроса те же теги проставляет пререндер
// (scripts/prerender.mjs) прямо в HTML-файл каждой страницы.
// ══════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useLang } from "../../i18n/LangContext";
import { LANGUAGES } from "../../i18n/locales";
import { SITE_URL, buildPath } from "../../lib/routes";

/** Найти или создать тег в <head> */
function meta(attr: "name" | "property", key: string, value: string) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function link(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function PageMeta({ page, problem }: { page: string; problem?: any }) {
  const { lang, content } = useLang();

  useEffect(() => {
    const company = content?.company || {};
    const brand = company.name || "OLAN HIGH TECH PROJECT";
    const sol = content?.solutions?.[page];

    // Заголовок и описание: на странице решения — про решение,
    // на главной — про компанию
    const title = problem
      ? `${problem.title} — ${brand}`
      : `${brand} — ${company.slogan || "Интеллектуальные системы контроля дорожного движения"}`;

    const description = (
      problem ? sol?.heroLead || problem.short : company.about || ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    const url = SITE_URL + buildPath(lang as any, page);
    const image = `${SITE_URL}/og-image.png`;

    document.title = title;
    meta("name", "description", description);
    meta("name", "robots", "index, follow");

    // Превью ссылки в мессенджерах и соцсетях
    meta("property", "og:type", problem ? "article" : "website");
    meta("property", "og:site_name", brand);
    meta("property", "og:title", title);
    meta("property", "og:description", description);
    meta("property", "og:url", url);
    meta("property", "og:image", image);
    meta("property", "og:image:width", "1200");
    meta("property", "og:image:height", "630");
    meta("property", "og:locale", lang);
    meta("name", "twitter:card", "summary_large_image");
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);
    meta("name", "twitter:image", image);

    // Основной адрес и языковые версии
    link("canonical", url);
    for (const l of LANGUAGES) {
      link("alternate", SITE_URL + buildPath(l.code, page), l.code);
    }
    link("alternate", SITE_URL + buildPath("ru", page), "x-default");
  }, [page, problem, lang, content]);

  return null;
}
