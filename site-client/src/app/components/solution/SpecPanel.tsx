// ══════════════════════════════════════════════════════════════════
// СТРАНИЦА РЕШЕНИЯ: ТЕХНИЧЕСКИЙ ПАСПОРТ
// Тёмная панель с ТТХ продукта (данные — solutions[id].specs).
// Всегда тёмная (force-dark), «прилипает» при прокрутке.
// ══════════════════════════════════════════════════════════════════

import { useLang } from "../../i18n/LangContext";

export function SpecPanel({ productName, specs }: { productName: string; specs: { k: string; v: string }[] }) {
  const { t } = useLang();
  return (
    <div className="hud force-dark p-7" style={{ borderRadius: "var(--r-lg)", background: "rgba(11,20,32,0.94)", border: "1px solid rgba(140,175,220,0.14)", boxShadow: "0 24px 60px rgba(2,8,18,0.45)" }}>
      <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: "1px solid rgba(140,175,220,0.08)" }}>
        <div className="font-tele text-[11px] tracking-[0.2em] uppercase" style={{ color: "rgba(198,214,236,0.58)" }}>
          {t.sol.passport}
        </div>
        <div className="font-display font-bold tracking-[0.1em]" style={{ color: "#41d9e8" }}>{productName}</div>
      </div>
      <div className="flex flex-col">
        {(specs || []).map((s, i) => (
          <div key={s.k} className="font-tele flex items-center justify-between gap-4 py-3 text-[12px]" style={{ borderBottom: i < specs.length - 1 ? "1px solid rgba(140,175,220,0.07)" : "none" }}>
            <span style={{ color: "rgba(178,198,226,0.5)" }}>{s.k}</span>
            <span className="text-right font-medium" style={{ color: "rgba(234,242,252,0.94)" }}>{s.v}</span>
          </div>
        ))}
      </div>
      <div className="font-tele flex items-center gap-2 mt-6 pt-4 text-[10px] tracking-[0.18em] uppercase" style={{ borderTop: "1px solid rgba(140,175,220,0.08)", color: "#3ddc84" }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3ddc84", animation: "pulse-dot 1.8s infinite" }} />
        {t.sol.certified}
      </div>
    </div>
  );
}
