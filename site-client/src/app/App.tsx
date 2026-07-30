// ══════════════════════════════════════════════════════════════════
// КОРНЕВОЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// Отвечает только за три вещи:
//   1. Текущая страница (главная или одно из 8 решений)
//   2. Тема (тёмная/светлая) с сохранением выбора в браузере
//   3. Функция navigate — переход между страницами и якорями секций
// Вся вёрстка — в pages/ и components/, все тексты — в data/.
// Подробная схема проекта — в файле ARCHITECTURE.md в корне.
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { LangProvider, useLang } from "./i18n/LangContext";
import { ChatWidget } from "./components/chat/ChatWidget";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { HomePage } from "./pages/HomePage";
import { SolutionPage } from "./pages/SolutionPage";
import type { Page, NavigateFn } from "./types";

function AppInner() {
  // ── Содержимое сайта (из админ-панели) и язык ──
  const { content } = useLang();
  const problems = content?.problems || [];

  // ── Состояние: текущая страница ──
  const [page, setPage] = useState<Page>("home");

  // ── Состояние: тема (читаем сохранённый выбор пользователя) ──
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("oht-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* локальное хранилище недоступно */ }
    return "dark";
  });

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("oht-theme", next); } catch { /* ок */ }
      return next;
    });
  };

  // ── Навигация: смена страницы + плавная прокрутка к якорю секции ──
  const navigate: NavigateFn = (p, anchor) => {
    setPage(p);
    window.setTimeout(() => {
      if (anchor) {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 80);
  };

  const currentProblem = problems.find((p: any) => p.id === page);

  return (
    <div
      data-theme={theme}
      className="oht-app min-h-screen"
      style={{ background: "var(--void)", fontFamily: "'Inter', sans-serif", color: "var(--txt)", transition: "background .3s ease, color .3s ease" }}
    >
      <Header page={page} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />

      <main>
        {page === "home" && <HomePage navigate={navigate} />}
        {page !== "home" && currentProblem && <SolutionPage problem={currentProblem} navigate={navigate} />}
      </main>

      <Footer navigate={navigate} />
      <ChatWidget />
    </div>
  );
}

// Оборачиваем всё приложение в языковой контекст:
// внутри него доступны t() для надписей и content для содержимого с сервера
export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
