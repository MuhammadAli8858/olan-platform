// ══════════════════════════════════════════════════════════════════
// ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА (9 языков)
// Показывает текущий язык, по клику открывает список.
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { LANGUAGES } from "../../i18n/locales";
import { useLang } from "../../i18n/LangContext";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // закрываем список по клику вне его
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Выбрать язык"
        className="flex items-center gap-2 rounded-full transition-colors duration-150"
        style={{
          height: compact ? 36 : 40, padding: compact ? "0 10px" : "0 14px",
          border: "1px solid var(--line)", background: "var(--chip-bg)",
          color: "var(--txt-2)", fontSize: 12, fontWeight: 600,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--cyan-border)"; e.currentTarget.style.color = "var(--cyan)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--txt-2)"; }}
      >
        <Globe style={{ width: 15, height: 15 }} />
        {current?.label}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 70,
            minWidth: 170, padding: 6, borderRadius: "var(--r-md)",
            background: "var(--panel-2)", border: "1px solid var(--line)",
            boxShadow: "0 18px 44px rgba(2,8,18,0.35)",
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 12px", borderRadius: 10,
                background: l.code === lang ? "var(--cyan-dim)" : "transparent",
                border: "none", cursor: "pointer", fontSize: 13,
                color: l.code === lang ? "var(--cyan)" : "var(--txt-2)",
                textAlign: "left",
              }}
            >
              <span>{l.native}</span>
              <span style={{ fontSize: 10, opacity: 0.6, fontFamily: "monospace" }}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
