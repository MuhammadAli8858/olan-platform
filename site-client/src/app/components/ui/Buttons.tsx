// ══════════════════════════════════════════════════════════════════
// UI: КНОПКИ
// PrimaryButton — главная оранжевая кнопка-пилюля со свечением
// GhostButton   — второстепенная прозрачная кнопка с рамкой
// ══════════════════════════════════════════════════════════════════

export function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full sm:w-auto justify-center flex items-center gap-2.5 text-sm font-semibold px-8 py-4 rounded-full transition-all duration-200"
      style={{ background: "var(--orange)", color: "#160A00", boxShadow: "var(--btn-glow)" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.filter = "none"; }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full sm:w-auto justify-center flex items-center gap-2.5 text-sm font-semibold px-8 py-4 rounded-full transition-colors duration-200"
      style={{ border: "1px solid var(--line)", color: "var(--txt)", background: "var(--ghost-bg)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cyan-border)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
    >
      {children}
    </button>
  );
}
