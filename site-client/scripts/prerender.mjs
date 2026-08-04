// ══════════════════════════════════════════════════════════════════
// ПРЕРЕНДЕР СТРАНИЦ
//
// Зачем это нужно.
// Сайт — одностраничное приложение: браузер получает пустой HTML
// и рисует содержимое скриптом. Люди этого не замечают, а вот
// поисковые роботы и мессенджеры — замечают. Telegram, WhatsApp,
// LinkedIn и почтовые клиенты НЕ выполняют JavaScript: они читают
// теги прямо из HTML. Поэтому раньше у любой ссылки на сайт было
// одинаковое (или пустое) превью — а для деловой переписки превью
// ссылки часто важнее самого письма.
//
// Что делает этот скрипт.
// После обычной сборки (npm run build) он создаёт по отдельному
// HTML-файлу на каждую страницу и каждый язык:
//
//   dist/ru/index.html
//   dist/ru/solutions/solution-speeding/index.html
//   dist/en/solutions/solution-speeding/index.html
//   … и так для всех языков и решений
//
// В каждом файле уже проставлены свой заголовок, описание,
// OG-теги, canonical, языковые версии и разметка Schema.org,
// а в <noscript> лежит настоящий текст страницы — то, что увидит
// поисковый робот. Скрипт приложения при этом остаётся прежним:
// открыв страницу, человек получает обычное приложение.
//
// Откуда берётся содержимое:
//   1. С боевого сервера (VITE_API_URL) — тогда в HTML попадут
//      тексты, отредактированные в админ-панели.
//   2. Если сервер недоступен — из начального наполнения
//      server/src/seed-content.js.
//
// Запуск: npm run build (пререндер вызывается сам)
// ══════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const SITE_URL = (process.env.VITE_SITE_URL || "https://olanhightech.com").replace(/\/+$/, "");
const API_URL = (process.env.VITE_API_URL || "").replace(/\/+$/, "");
const DEFAULT_LANG = "ru";

const LANG_META = {
  ru: { name: "Русский", locale: "ru_RU", dir: "ltr" },
  uz: { name: "O'zbekcha", locale: "uz_UZ", dir: "ltr" },
  en: { name: "English", locale: "en_US", dir: "ltr" },
  zh: { name: "中文", locale: "zh_CN", dir: "ltr" },
  ar: { name: "العربية", locale: "ar_AE", dir: "rtl" },
};

// ─── Вспомогательное ──────────────────────────────────────────────

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clean = (s = "") => String(s).replace(/\s+/g, " ").trim();

const cut = (s, n) => {
  const t = clean(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,;:.–—-]+$/, "") + "…";
};

const buildPath = (lang, page) =>
  page === "home" ? `/${lang}/` : `/${lang}/solutions/${page}`;

// ─── Содержимое сайта ─────────────────────────────────────────────

async function loadFromApi(langs) {
  if (!API_URL) return null;
  const out = {};
  for (const lang of langs) {
    const res = await fetch(`${API_URL}/api/content?lang=${lang}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} для языка ${lang}`);
    const json = await res.json();
    if (!json?.data) throw new Error(`пустой ответ для языка ${lang}`);
    out[lang] = json.data;
  }
  return out;
}

async function loadFromSeed() {
  const seedPath = path.join(ROOT, "..", "server", "src", "seed-content.js");
  if (!fs.existsSync(seedPath)) throw new Error("не найден server/src/seed-content.js");
  const mod = await import(pathToFileURL(seedPath).href);
  return mod.seedContent();
}

async function loadContent() {
  const langs = Object.keys(LANG_META);
  if (API_URL) {
    try {
      const data = await loadFromApi(langs);
      console.log(`  содержимое взято с сервера ${API_URL}`);
      return data;
    } catch (err) {
      console.warn(`  ⚠ сервер недоступен (${err.message}), берём начальное наполнение`);
    }
  }
  const data = await loadFromSeed();
  console.log("  содержимое взято из server/src/seed-content.js");
  return data;
}

// ─── Сборка HTML одной страницы ───────────────────────────────────

function pageData(content, lang, page) {
  const site = content[lang] || content[DEFAULT_LANG];
  const company = site.company || {};
  const brand = company.name || "OLAN HIGH TECH PROJECT";

  if (page === "home") {
    return {
      title: `${brand} — ${company.slogan || "Intelligent Traffic Enforcement"}`,
      description: cut(company.about || "", 300),
      type: "website",
      body: homeBody(site),
    };
  }

  const problem = (site.problems || []).find((p) => p.id === page);
  const sol = site.solutions?.[page];
  if (!problem) return null;

  return {
    title: `${clean(problem.title)} — ${brand}`,
    description: cut(sol?.heroLead || problem.short || "", 300),
    type: "article",
    body: solutionBody(site, problem, sol),
  };
}

/** Текст главной для поисковых роботов */
function homeBody(site) {
  const company = site.company || {};
  const rows = [];
  rows.push(`<h1>${esc(company.name || "OLAN HIGH TECH PROJECT")}</h1>`);
  if (company.slogan) rows.push(`<p>${esc(company.slogan)}</p>`);
  if (company.about) rows.push(`<p>${esc(clean(company.about))}</p>`);

  if (site.hero?.lead) rows.push(`<p>${esc(clean(site.hero.lead))}</p>`);

  if ((site.problems || []).length) {
    rows.push("<h2>Проблемы и решения</h2><ul>");
    for (const p of site.problems) {
      rows.push(
        `<li><a href="${buildPath(site.__lang, p.id)}">${esc(clean(p.title))}</a> — ${esc(clean(p.short || ""))}</li>`
      );
    }
    rows.push("</ul>");
  }

  const contacts = [company.phone, company.email, company.address].filter(Boolean);
  if (contacts.length) rows.push(`<p>${contacts.map((c) => esc(c)).join(" · ")}</p>`);

  return rows.join("\n");
}

/** Текст страницы решения для поисковых роботов */
function solutionBody(site, problem, sol) {
  const rows = [];
  rows.push(`<h1>${esc(clean(problem.title))}</h1>`);
  if (sol?.heroLead) rows.push(`<p>${esc(clean(sol.heroLead))}</p>`);
  if (sol?.solutionTitle) rows.push(`<h2>${esc(clean(sol.solutionTitle))}</h2>`);
  if (sol?.sellText) rows.push(`<p>${esc(clean(sol.sellText))}</p>`);

  for (const f of sol?.features || []) {
    rows.push(`<h3>${esc(clean(f.title))}</h3><p>${esc(clean(f.desc))}</p>`);
  }

  // Каталог комплексов — самое важное для поиска по названиям приборов
  if ((sol?.devices || []).length) {
    rows.push(`<h2>${esc(clean(sol.catalogTitle || "Каталог комплексов"))}</h2>`);
    if (sol.catalogLead) rows.push(`<p>${esc(clean(sol.catalogLead))}</p>`);
    for (const d of sol.devices) {
      rows.push(`<h3>${esc(clean(d.name))}</h3>`);
      if (d.tagline) rows.push(`<p>${esc(clean(d.tagline))}</p>`);
      if (d.description || d.summary) rows.push(`<p>${esc(clean(d.description || d.summary))}</p>`);
      if ((d.specs || []).length) {
        rows.push("<ul>");
        for (const s of d.specs) rows.push(`<li>${esc(clean(s.k))}: ${esc(clean(s.v))}</li>`);
        rows.push("</ul>");
      }
      rows.push(`<p>${esc(d.priceNote || "Цена по запросу")}</p>`);
    }
  }

  if ((sol?.results || []).length) {
    rows.push("<h2>Результаты внедрения</h2><ul>");
    for (const r of sol.results) rows.push(`<li>${esc(clean(r.value))} — ${esc(clean(r.label))}</li>`);
    rows.push("</ul>");
  }

  return rows.join("\n");
}

/** Разметка Schema.org — как страницу понимает поиск */
function jsonLd(content, lang, page, url, data) {
  const site = content[lang] || content[DEFAULT_LANG];
  const company = site.company || {};
  const org = {
    "@type": "Organization",
    name: company.name || "OLAN HIGH TECH PROJECT",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: clean(company.about || ""),
    ...(company.email ? { email: company.email } : {}),
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.address ? { address: { "@type": "PostalAddress", streetAddress: company.address } } : {}),
  };

  if (page === "home") {
    return { "@context": "https://schema.org", ...org };
  }

  const sol = site.solutions?.[page];
  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: data.title,
      description: data.description,
      url,
      inLanguage: lang,
      publisher: org,
    },
  ];

  // Каждый прибор — отдельный товар с ценой по запросу
  for (const d of sol?.devices || []) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: clean(d.name),
      description: clean(d.description || d.summary || ""),
      brand: { "@type": "Brand", name: company.name || "OLAN HIGH TECH PROJECT" },
      ...(d.photos?.[0]?.src ? { image: SITE_URL + d.photos[0].src } : {}),
      ...((d.specs || []).length
        ? {
            additionalProperty: d.specs.map((s) => ({
              "@type": "PropertyValue",
              name: clean(s.k),
              value: clean(s.v),
            })),
          }
        : {}),
      offers: {
        "@type": "Offer",
        url,
        availability: "https://schema.org/InStock",
        priceSpecification: { "@type": "PriceSpecification", price: 0, priceCurrency: "USD", valueAddedTaxIncluded: false },
        description: d.priceNote || "Цена по запросу",
      },
    });
  }

  return graph.length === 1 ? graph[0] : graph;
}

function renderHtml(template, { content, lang, page, data }) {
  const url = SITE_URL + buildPath(lang, page);
  const meta = LANG_META[lang];
  const image = `${SITE_URL}/og-image.png`;

  const head = [
    `<title>${esc(data.title)}</title>`,
    `<meta name="description" content="${esc(data.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<link rel="canonical" href="${url}" />`,
    ``,
    `<meta property="og:type" content="${data.type}" />`,
    `<meta property="og:site_name" content="${esc(content[lang]?.company?.name || "OLAN HIGH TECH PROJECT")}" />`,
    `<meta property="og:title" content="${esc(data.title)}" />`,
    `<meta property="og:description" content="${esc(data.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="${meta.locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(data.title)}" />`,
    `<meta name="twitter:description" content="${esc(data.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ``,
    ...Object.keys(LANG_META).map(
      (l) => `<link rel="alternate" hreflang="${l}" href="${SITE_URL + buildPath(l, page)}" />`
    ),
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL + buildPath(DEFAULT_LANG, page)}" />`,
    ``,
    `<script type="application/ld+json">${JSON.stringify(jsonLd(content, lang, page, url, data))}</script>`,
  ].join("\n    ");

  let html = template;

  // Заменяем всё, что стояло в шаблоне по умолчанию
  html = html.replace(/<title>[\s\S]*?<\/title>/, "___HEAD___");
  html = html.replace(/^\s*<meta name="description"[^>]*>\s*$/m, "");
  html = html.replace(/^\s*<meta name="robots"[^>]*>\s*$/m, "");
  html = html.replace(/^\s*<link rel="canonical"[^>]*>\s*$/m, "");
  html = html.replace(/^\s*<meta property="og:[^>]*>\s*$/gm, "");
  html = html.replace(/^\s*<meta name="twitter:[^>]*>\s*$/gm, "");
  html = html.replace("___HEAD___", head);

  html = html.replace(/<html[^>]*>/, `<html lang="${lang}" dir="${meta.dir}">`);

  // Настоящий текст страницы — его видит поисковый робот,
  // человеку он не показывается (приложение перерисует #root)
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n    <noscript>\n${data.body}\n    </noscript>`
  );

  return html;
}

// ─── Запись файлов ────────────────────────────────────────────────

function writePage(relPath, html) {
  const dir = path.join(DIST, relPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
}

async function main() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.error("✗ Сначала соберите сайт: dist/index.html не найден");
    process.exit(1);
  }

  console.log("\n▸ Пререндер страниц");
  const content = await loadContent();
  const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

  const langs = Object.keys(LANG_META).filter((l) => content[l]);
  const urls = [];
  let count = 0;

  for (const lang of langs) {
    content[lang].__lang = lang; // нужно для ссылок в noscript
    const pages = ["home", ...(content[lang].problems || []).map((p) => p.id)];

    for (const page of pages) {
      const data = pageData(content, lang, page);
      if (!data) continue;

      const html = renderHtml(template, { content, lang, page, data });
      const rel = page === "home" ? lang : path.join(lang, "solutions", page);
      writePage(rel, html);
      urls.push({ url: SITE_URL + buildPath(lang, page), lang, page });
      count++;
    }
  }

  // Корень сайта — версия на языке по умолчанию
  const rootData = pageData(content, DEFAULT_LANG, "home");
  if (rootData) {
    fs.writeFileSync(
      path.join(DIST, "index.html"),
      renderHtml(template, { content, lang: DEFAULT_LANG, page: "home", data: rootData }),
      "utf8"
    );
  }

  // ─── sitemap.xml ───
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9"`.replace("www.sitemap.org", "www.sitemaps.org") +
    ` xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls
      .map(({ url, page }) => {
        const alts = langs
          .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL + buildPath(l, page)}"/>`)
          .join("\n");
        return `  <url>\n    <loc>${url}</loc>\n${alts}\n    <changefreq>weekly</changefreq>\n    <priority>${page === "home" ? "1.0" : "0.8"}</priority>\n  </url>`;
      })
      .join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap, "utf8");

  // ─── robots.txt ───
  fs.writeFileSync(
    path.join(DIST, "robots.txt"),
    `# Сайт открыт для индексации\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    "utf8"
  );

  console.log(`  создано страниц: ${count} (${langs.length} языка × страницы)`);
  console.log(`  sitemap.xml: ${urls.length} адресов`);
  console.log(`  robots.txt: индексация разрешена`);
  console.log(`  базовый адрес: ${SITE_URL}`);
  console.log("▸ Готово\n");
}

main().catch((err) => {
  console.error("✗ Пререндер не удался:", err.message);
  process.exit(1);
});
