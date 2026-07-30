// ══════════════════════════════════════════════════════════════════
// КОНСОЛЬ: ЖИВАЯ ЛЕНТА ФИКСАЦИЙ
// Каждые 2,6 сек добавляет строку «номер · нарушение · данные»
// Список строк — в src/app/data/company.ts (detections)
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLang } from "../../i18n/LangContext";

export function LiveFeed() {
  const { content } = useLang();
  const detections = content?.detections || [];
  const [rows, setRows] = useState<any[]>(() => detections.slice(0, 4));
  const [cursor, setCursor] = useState(4);

  useEffect(() => {
    if (!detections.length) return;
    setRows(detections.slice(0, 4));
    const id = setInterval(() => {
      setRows((prev) => [detections[cursor % detections.length], ...prev.slice(0, 3)]);
      setCursor((c) => c + 1);
    }, 2600);
    return () => clearInterval(id);
  }, [cursor, detections.length]);

  const typeColor = (t: string) =>
    t === "ПРЕВЫШЕНИЕ" ? "var(--orange)" : t === "КРАСНЫЙ СВЕТ" ? "var(--red)" : "var(--cyan)";

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((d, i) => (
        <div
          key={`${d.plate}-${cursor}-${i}`}
          className={`font-tele flex items-center justify-between gap-2 md:gap-3 px-2.5 md:px-3.5 py-2.5 text-[10px] md:text-[11px] ${i === 0 ? "animate-feed-in" : ""}`}
          style={{ borderRadius: "var(--r-sm)", background: i === 0 ? "rgba(65,217,232,0.07)" : "rgba(255,255,255,0.025)", border: "1px solid " + (i === 0 ? "rgba(65,217,232,0.25)" : "var(--line-soft)") }}
        >
          <span className="px-1.5 py-0.5 font-bold tracking-wider" style={{ background: "#E8EEF6", color: "#0A1220", borderRadius: 4 }}>
            {d.plate}
          </span>
          <span style={{ color: typeColor(d.type) }}>{d.type}</span>
          <span style={{ color: "var(--txt-2)" }}>{d.value}</span>
          <span className="hidden sm:inline" style={{ color: "var(--txt-3)" }}>{d.zone}</span>
        </div>
      ))}
    </div>
  );
}