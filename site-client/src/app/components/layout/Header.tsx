// ══════════════════════════════════════════════════════════════════
// ШАПКА САЙТА (фиксированная)
// Статусная строка · логотип · навигация по якорям секций ·
// переключатель темы (солнце/луна) · кнопка «Запросить КП» ·
// мобильное меню
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { OlanLogo } from "../ui/OlanLogo";
import type { Page, NavigateFn } from "../../types";
import { useLang } from "../../i18n/LangContext";
import { LangSwitcher } from "../ui/LangSwitcher";

// ─── ШАПКА ───────────────────────────────────────────────────────────────────

export function Header({ page, navigate, theme, toggleTheme }: { page: Page; navigate: NavigateFn; theme: "dark" | "light"; toggleTheme: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, content } = useLang();
  const company = content?.company || {};

  const nav = [
    { label: t.nav.home, go: () => navigate("home") },
    { label: t.nav.problems, go: () => navigate("home", "problems") },
    { label: t.nav.projects, go: () => navigate("home", "projects") },
    { label: t.nav.geography, go: () => navigate("home", "geography") },
    { label: t.nav.partners, go: () => navigate("home", "partners") },
    { label: t.nav.contacts, go: () => navigate("home", "contact") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "var(--header-bg)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--line)" }}>
      <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-6 h-7 font-tele text-[10px] tracking-[0.18em] uppercase" style={{ borderBottom: "1px solid var(--line-soft)", color: "var(--txt-2)" }}>
        <span className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full" style={{ background: "var(--green)", animation: "pulse-dot 1.8s infinite" }} />
          {t.header.status}
        </span>
        <span>{company.statusLine || ""}</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <button onClick={() => navigate("home")} className="flex items-center gap-3 flex-shrink-0">
          <OlanLogo size={40} className="flex-shrink-0" title={company.name || "OLAN HIGH TECH PROJECT"} />
          <div className="text-left leading-none">
            <div className="font-display font-bold text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.12em]" style={{ color: "var(--txt)" }}>
              {company.name || "OLAN HIGH TECH PROJECT"}
            </div>
            <div className="font-tele tracking-[0.28em]" style={{ color: "var(--cyan)", fontSize: "8.5px", marginTop: 3 }}>
              {company.slogan || "INTELLIGENT TRAFFIC ENFORCEMENT"}
            </div>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-6">
          {nav.map((item) => (
            <button
              key={item.label}
              onClick={item.go}
              className="text-sm transition-colors duration-150"
              style={{ color: "var(--txt-2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--txt)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-2)"; }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <LangSwitcher />
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150"
            style={{ border: "1px solid var(--line)", color: "var(--txt-2)", background: "var(--chip-bg)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cyan-border)"; e.currentTarget.style.color = "var(--cyan)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--txt-2)"; }}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate("home", "contact")}
            className="text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-150"
            style={{ background: "var(--orange)", color: "#160A00", boxShadow: "var(--btn-glow)" }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            {t.header.quote}
          </button>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <LangSwitcher compact />
          <button onClick={toggleTheme} aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"} className="p-2" style={{ color: "var(--txt-2)" }}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button className="p-2" style={{ color: "var(--txt)" }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden px-6 py-5 flex flex-col gap-4" style={{ background: "var(--void)", borderTop: "1px solid var(--line)" }}>
          {nav.map((item) => (
            <button key={item.label} onClick={() => { item.go(); setMobileOpen(false); }} className="text-sm text-left" style={{ color: "var(--txt-2)" }}>
              {item.label}
            </button>
          ))}
          <button onClick={() => { navigate("home", "contact"); setMobileOpen(false); }} className="text-sm font-semibold px-5 py-3 rounded-full text-center" style={{ background: "var(--orange)", color: "#160A00" }}>
            {t.header.quote}
          </button>
        </div>
      )}
    </header>
  );
}
