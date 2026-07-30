// ══════════════════════════════════════════════════════════════════
// СТРАНИЦА РЕШЕНИЯ: ХЛЕБНЫЕ КРОШКИ
// Главная → Проблемы и решения → Код проблемы
// ══════════════════════════════════════════════════════════════════

import { ChevronRight } from "lucide-react";
import type { NavigateFn } from "../../types";
import { useLang } from "../../i18n/LangContext";

export function Breadcrumbs({ navigate, current }: { navigate: NavigateFn; current: string }) {
  const { t } = useLang();
  return (
    <div className="font-tele flex items-center gap-2 text-[11px] tracking-wider mb-9" style={{ color: "var(--txt-3)" }}>
      <button
        onClick={() => navigate("home")}
        className="transition-colors uppercase"
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--txt)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-3)"; }}
      >
        {t.nav.home}
      </button>
      <ChevronRight className="w-3 h-3" />
      <button
        onClick={() => navigate("home", "problems")}
        className="transition-colors uppercase"
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--txt)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-3)"; }}
      >
        {t.nav.problems}
      </button>
      <ChevronRight className="w-3 h-3" />
      <span className="uppercase" style={{ color: "var(--cyan)" }}>{current}</span>
    </div>
  );
}
