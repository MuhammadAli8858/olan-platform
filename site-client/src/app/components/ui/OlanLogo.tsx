// ══════════════════════════════════════════════════════════════════
// ЛОГОТИП OLAN HIGH TECH — вариант «Щит + Радар»
//
// Щит (оранжевый контур) с радаром внутри: два кольца, луч
// сканирования и оранжевая метка-цель. Один SVG на весь сайт:
// шапка, подвал, любые карточки. Цвета берутся из фирменной
// палитры (оранжевый var(--orange), бирюзовый var(--cyan)).
//
// size    — сторона в пикселях
// showGrid — false убирает мелкие кольца (для очень мелких размеров,
//            например favicon 16px, где кольца сливаются)
// ══════════════════════════════════════════════════════════════════

export function OlanLogo({
  size = 40,
  showGrid = true,
  className,
  title = "OLAN HIGH TECH",
}: {
  size?: number;
  showGrid?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Щит */}
      <path
        d="M32 4 L56 15 V36 C56 49 45 57 32 61 C19 57 8 49 8 36 V15 Z"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Радар внутри щита */}
      {showGrid && (
        <>
          <circle cx="32" cy="31" r="16" fill="none" stroke="var(--cyan)" strokeWidth="1.4" opacity="0.5" />
          <circle cx="32" cy="31" r="9" fill="none" stroke="var(--cyan)" strokeWidth="1.4" opacity="0.3" />
        </>
      )}
      <path d="M32 31 L46 40" stroke="var(--cyan)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="40" cy="22" r="3.2" fill="var(--orange)" />
    </svg>
  );
}
