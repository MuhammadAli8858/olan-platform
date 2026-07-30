// ══════════════════════════════════════════════════════════════════
// ЯЗЫК САЙТА И ЗАГРУЗКА СОДЕРЖИМОГО
//
// Что делает этот файл:
//  1. Хранит выбранный язык (запоминается в браузере).
//  2. Даёт функцию t() для надписей интерфейса.
//  3. Подтягивает содержимое сайта (проблемы, решения, проекты,
//     партнёры) с сервера — то, что редактируется в админ-панели.
//     Если сервер недоступен, сайт работает на встроенных данных.
//  4. Включает режим справа-налево для арабского языка.
// ══════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, LANGUAGES, type LangCode } from "./locales";
import { API_URL } from "../config";
import { problems as localProblems } from "../data/problems";
import { solutions as localSolutions } from "../data/solutions";
import * as localCompany from "../data/company";

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (typeof dict)["ru"];
  rtl: boolean;
  content: any;      // содержимое с сервера (или встроенное)
  loading: boolean;
};

const LangCtx = createContext<Ctx | null>(null);

/** Встроенный запасной вариант — сайт работает даже без сервера */
const fallbackContent = {
  problems: localProblems,
  solutions: localSolutions,
  stats: localCompany.stats,
  processSteps: localCompany.processSteps,
  detections: localCompany.detections,
  countries: localCompany.cisCountries.map((name: string) => ({ name })),
  projectMarkers: localCompany.projectMarkers,
  projects: localCompany.projects,
  partners: localCompany.partners.map((p: any) => ({ ...p, logo: "", description: "" })),
  certs: ["ISO 9001:2015", "CE Certified", "IP68 Rated", "GDPR Compliant", "ETSC Approved", "UN Road Safety"],
  company: {
    name: "OLAN HIGH TECH PROJECT",
    slogan: "INTELLIGENT TRAFFIC ENFORCEMENT",
    phone: "+998 71 200-00-00",
    email: "contact@olanhightech.com",
    address: "г. Ташкент, ул. Инновационная, 12",
    about: "Интеллектуальные системы контроля дорожного движения государственного класса.",
    statusLine: "Гос-заказы и частный сектор · 6 стран СНГ · поддержка 24/7",
  },
  hero: {
    badge: "Интеллектуальный контроль дорожного движения",
    titleLine1: "С какой проблемой",
    titleAccent: "безопасности",
    titleLine3: "вы столкнулись?",
    lead: "Выберите вашу задачу — у нас есть проверенное решение государственного класса.",
  },
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    try {
      const saved = localStorage.getItem("oht-lang") as LangCode;
      if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
      // подсказка из настроек браузера
      const nav = navigator.language.slice(0, 2) as LangCode;
      if (LANGUAGES.some((l) => l.code === nav)) return nav;
    } catch { /* ок */ }
    return "ru";
  });

  const [content, setContent] = useState<any>(fallbackContent);
  const [loading, setLoading] = useState(true);

  const setLang = (l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem("oht-lang", l); } catch { /* ок */ }
  };

  const rtl = LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;

  // направление текста и атрибут языка для всей страницы
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [lang, rtl]);

  // подтягиваем содержимое, отредактированное в админ-панели
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/content?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled && json?.data) setContent(json.data);
      })
      .catch(() => {
        // сервер недоступен — работаем на встроенных данных
        if (!cancelled) setContent(fallbackContent);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang, t: dict[lang] as any, rtl, content, loading }}>
      {children}
    </LangCtx.Provider>
  );
}

/** Хук для доступа к языку и содержимому: const { t, content } = useLang(); */
export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang должен вызываться внутри LangProvider");
  return ctx;
}
