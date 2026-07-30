// ══════════════════════════════════════════════════════════════════
// КОНСОЛЬ МОНИТОРИНГА — фирменный элемент сайта (правая часть хиро)
// Собирает RadarScope + LiveFeed в тёмную панель «центра управления».
// Класс force-dark оставляет её тёмным «экраном» даже в светлой теме.
// ══════════════════════════════════════════════════════════════════

import { RadarScope } from "./RadarScope";
import { LiveFeed } from "./LiveFeed";
import { useLang } from "../../i18n/LangContext";

export function MonitoringConsole() {
  const { t } = useLang();
  return (
    <div className="hud force-dark p-4 md:p-6" style={{ borderRadius: "var(--r-lg)", background: "rgba(11,20,32,0.9)", border: "1px solid rgba(140,175,220,0.14)", backdropFilter: "blur(14px)", boxShadow: "0 24px 60px rgba(2,8,18,0.5)" }}>
      <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid rgba(140,175,220,0.08)" }}>
        <div className="font-tele text-[11px] tracking-[0.2em] uppercase" style={{ color: "rgba(198,214,236,0.58)" }}>
          OHT // {t.console.title}
        </div>
        <div className="font-tele flex items-center gap-2 text-[11px] tracking-widest" style={{ color: "#3ddc84" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3ddc84", animation: "pulse-dot 1.8s ease-in-out infinite" }} />
          {t.console.online}
        </div>
      </div>
      <RadarScope />
      <div className="font-tele flex items-center justify-between text-[10px] tracking-[0.18em] uppercase my-5" style={{ color: "rgba(178,198,226,0.34)" }}>
        <span>{t.console.feed}</span>
        <span style={{ color: "#41d9e8" }}>{t.console.sector}</span>
      </div>
      <LiveFeed />
    </div>
  );
}
