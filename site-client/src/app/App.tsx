// ══════════════════════════════════════════════════════════════════
// КОРНЕВОЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// Отвечает только за три вещи:
//   1. Текущая страница (главная или одно из 8 решений)
//   2. Тема (тёмная/светлая) с сохранением выбора в браузере
//   3. Функция navigate — переход между страницами и якорями секций
// Вся вёрстка — в pages/ и components/, все тексты — в data/.
// Подробная схема проекта — в файле ARCHITECTURE.md в корне.
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { LangProvider, useLang } from "./i18n/LangContext";
import { ChatWidget } from "./components/chat/ChatWidget";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { HomePage } from "./pages/HomePage";
import { SolutionPage } from "./pages/SolutionPage";
import type { Page, NavigateFn } from "./types";
import { currentRoute, buildPath } from "./lib/routes";
import { PageMeta } from "./components/layout/PageMeta";

function AppInner() {
  // ── Содержимое сайта (из админ-панели) и язык ──
  const { content, lang } = useLang();
  const problems = content?.problems || [];

  // ── Состояние: текущая страница (берётся из адреса) ──
  const [page, setPage] = useState<Page>(() => currentRoute().page as Page);

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

  // ── Кнопки «назад» и «вперёд» в браузере ──
  useEffect(() => {
    const onPop = () => setPage(currentRoute().page as Page);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Навигация: меняем адрес страницы и прокручиваем к якорю ──
  const navigate: NavigateFn = (p, anchor) => {
    setPage(p);
    // адрес меняется без перезагрузки — ссылку можно скопировать и отправить
    window.history.pushState({ page: p }, "", buildPath(lang, p));
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
      {/* Заголовок вкладки, описание и OG-теги для превью ссылок */}
      <PageMeta page={page} problem={currentProblem} />

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
