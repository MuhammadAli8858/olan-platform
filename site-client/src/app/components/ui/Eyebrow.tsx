// ══════════════════════════════════════════════════════════════════
// UI: EYEBROW — маленький заголовок-надстрочник над секциями
// («Диагностика // Проблемы и решения» и т.п.)
// ══════════════════════════════════════════════════════════════════

export function Eyebrow({ children, color = "var(--cyan)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="font-tele flex items-center gap-2.5 text-[11px] font-medium tracking-[0.22em] uppercase mb-5" style={{ color }}>
      <span className="inline-block w-6 h-px rounded-full" style={{ background: color }} />
      {children}
    </div>
  );
}
