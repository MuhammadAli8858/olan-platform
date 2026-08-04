// ══════════════════════════════════════════════════════════════════
// ПРОСМОТР ФОТОГРАФИИ НА ВЕСЬ ЭКРАН
//
// Открывается поверх карточки прибора при нажатии на фото.
// Закрывается кнопкой «Назад», клавишей Esc или щелчком по фону.
// Между фотографиями можно листать стрелками и клавишами ← →.
//
// Пока просмотрщик открыт, страница под ним не прокручивается —
// иначе после закрытия пользователь оказывался бы в другом месте.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLang } from "../../i18n/LangContext";

export type Photo = { src: string; caption?: string };

export function PhotoLightbox({
  photos, index, onClose, onIndex,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const { t } = useLang();
  const total = photos.length;
  const photo = photos[index];

  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);

  // Клавиатура: Esc — закрыть, ← → — листать
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  // Блокируем прокрутку страницы под просмотрщиком
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, []);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || t.sol.photos}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4, 10, 18, 0.96)",
        backdropFilter: "blur(6px)",
        display: "flex", flexDirection: "column",
        animation: "lightbox-in .18s ease both",
      }}
    >
      {/* ─── Панель управления ─── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 px-4 sm:px-7 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(140,175,220,0.12)" }}
      >
        <button
          onClick={onClose}
          className="font-tele inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] tracking-[0.14em] uppercase transition-colors duration-200"
          style={{ background: "var(--orange-dim)", border: "1px solid var(--orange-border)", color: "var(--orange)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.sol.backToPhotos}
        </button>

        <div className="font-tele text-[11px] tracking-[0.16em] flex items-center gap-3" style={{ color: "rgba(198,214,236,0.6)" }}>
          {total > 1 && <span>{index + 1} {t.sol.of} {total}</span>}
          <button onClick={onClose} aria-label={t.sol.back} className="p-1.5 rounded-lg transition-colors duration-200" style={{ color: "rgba(198,214,236,0.75)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Фотография ─── */}
      <div className="flex-1 flex items-center justify-center relative px-3 sm:px-16 py-5 min-h-0">
        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="←"
            className="absolute left-2 sm:left-5 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
            style={{ background: "rgba(11,20,32,0.85)", border: "1px solid rgba(140,175,220,0.25)", color: "var(--cyan)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={photo.src}
          alt={photo.caption || ""}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "100%", maxHeight: "100%",
            objectFit: "contain",
            borderRadius: "var(--r-md)",
            border: "1px solid rgba(140,175,220,0.18)",
          }}
        />

        {total > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="→"
            className="absolute right-2 sm:right-5 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
            style={{ background: "rgba(11,20,32,0.85)", border: "1px solid rgba(140,175,220,0.25)", color: "var(--cyan)" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── Подпись и миниатюры ─── */}
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 px-4 sm:px-7 pb-6 pt-3 text-center">
        {photo.caption && (
          <p className="font-tele text-[11px] tracking-[0.14em] uppercase mb-4" style={{ color: "rgba(198,214,236,0.7)", overflowWrap: "anywhere" }}>
            {photo.caption}
          </p>
        )}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {photos.map((p, i) => (
              <button
                key={p.src + i}
                onClick={() => onIndex(i)}
                aria-label={p.caption || `${i + 1}`}
                style={{
                  width: 54, height: 34, borderRadius: 6, overflow: "hidden",
                  border: i === index ? "2px solid var(--orange)" : "1px solid rgba(140,175,220,0.22)",
                  opacity: i === index ? 1 : 0.5,
                  transition: "opacity .2s, border-color .2s",
                  background: "rgba(11,20,32,0.9)",
                }}
              >
                <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
