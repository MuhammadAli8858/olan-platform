// ══════════════════════════════════════════════════════════════════
// ТИПЫ ПРОЕКТА
// Page        — идентификаторы всех страниц сайта
// NavigateFn  — функция навигации (страница + необязательный якорь секции)
// SolutionContent — структура контента страницы решения
// ══════════════════════════════════════════════════════════════════

export type Page = string; // "home" или id проблемы из админ-панели

export type KnownPage =
  | "home"
  | "solution-speeding"
  | "solution-redlight"
  | "solution-parking"
  | "solution-nostopping"
  | "solution-buslane"
  | "solution-railway"
  | "solution-phone"
  | "solution-seatbelt";

export type NavigateFn = (p: Page, anchor?: string) => void;

export type SolutionContent = {
  heroAccent: string;        // акцентная (оранжевая) часть заголовка
  heroRest: string;          // остальная часть заголовка
  heroLead: string;          // подводка под заголовком
  stats: { value: string; fact: string; source: string }[];   // 3 факта о проблеме
  productName: string;       // название продукта (OHT-R800 и т.д.)
  solutionTitle: string;     // заголовок блока решения
  sellText: string;          // продающий текст
  features: { icon: any; title: string; desc: string }[];     // 4 преимущества
  specs: { k: string; v: string }[];                           // техпаспорт
  results: { value: string; label: string }[];                 // 4 результата
  ctaLine: string;           // персональный призыв к действию
};
