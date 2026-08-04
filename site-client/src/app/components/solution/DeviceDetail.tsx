// ══════════════════════════════════════════════════════════════════
// ПОЛНАЯ КАРТОЧКА ПРИБОРА
//
// Открывается поверх страницы решения при нажатии на карточку
// в каталоге и показывается С САМОГО ВЕРХА страницы.
// Внутри: фотографии, описание, возможности и техпаспорт.
//
// Кнопка «Назад к каталогу» есть и сверху, и внизу — чтобы
// не приходилось прокручивать длинный техпаспорт обратно.
// Нажатие на фотографию открывает её на весь экран.
//
// Цена не показывается нигде: только «Цена по запросу»
// и кнопка запроса — расчёт готовит менеджер.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { ArrowLeft, Maximize2, Tag, ArrowRight } from "lucide-react";
import { useLang } from "../../i18n/LangContext";
import { getIcon } from "../../lib/icons";
import { PhotoLightbox, type Photo } from "./PhotoLightbox";

export type Device = {
  id: string;
  name: string;
  tagline?: string;
  icon?: string;
  badge?: string;
  summary?: string;
  description?: string;
  highlights?: string[];
  specs?: { k: string; v: string }[];
  features?: { icon?: string; title: string; desc: string }[];
  photos?: Photo[];
  priceNote?: string;
};

export function DeviceDetail({
  device, onBack, onRequest,
}: {
  device: Device;
  onBack: () => void;
  /** прокрутить к форме заявки внизу страницы решения */
  onRequest: () => void;
}) {
  const { t } = useLang();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [cover, setCover] = useState(0);

  const photos = device.photos || [];
  const specs = device.specs || [];
  const features = device.features || [];
  const Icon = getIcon(device.icon || "Radar");

  // Карточка открывается всегда с самого верха страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [device.id]);

  const BackButton = ({ full = false }: { full?: boolean }) => (
    <button
      onClick={onBack}
      className="font-tele inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[11px] tracking-[0.16em] uppercase transition-all duration-200"
      style={{
        background: "var(--orange-dim)",
        border: "1px solid var(--orange-border)",
        color: "var(--orange)",
        width: full ? "100%" : undefined,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--orange)"; e.currentTarget.style.color = "#0B1420"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--orange-dim)"; e.currentTarget.style.color = "var(--orange)"; }}
    >
      <ArrowLeft className="w-4 h-4" />
      {t.sol.backToCatalog}
    </button>
  );

  return (
    <>
      <section
        className="tech-grid"
        style={{
          background: "var(--void)",
          paddingTop: "clamp(110px, 20vw, 150px)",
          paddingBottom: "clamp(48px, 9vw, 80px)",
          minHeight: "100vh",
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8"><BackButton /></div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* ─── Фотографии ─── */}
            <div className="lg:sticky lg:top-28">
              {photos.length > 0 ? (
                <>
                  <button
                    onClick={() => setLightbox(cover)}
                    className="hud group block w-full relative overflow-hidden"
                    style={{
                      borderRadius: "var(--r-lg)",
                      border: "1px solid var(--line)",
                      background: "var(--panel-2)",
                      boxShadow: "var(--card-shadow)",
                      aspectRatio: "800 / 520",
                    }}
                    aria-label={t.sol.photoHint}
                  >
                    <img
                      src={photos[cover].src}
                      alt={photos[cover].caption || device.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <span
                      className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 rounded-full font-tele text-[10px] tracking-[0.14em] uppercase transition-opacity duration-200 opacity-80 group-hover:opacity-100"
                      style={{ background: "rgba(11,20,32,0.9)", border: "1px solid rgba(140,175,220,0.25)", color: "var(--cyan)" }}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      {t.sol.photos}
                    </span>
                  </button>

                  {photos.length > 1 && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {photos.map((p, i) => (
                        <button
                          key={p.src + i}
                          onClick={() => { setCover(i); setLightbox(i); }}
                          className="relative overflow-hidden transition-all duration-200"
                          style={{
                            borderRadius: "var(--r-md)",
                            border: i === cover ? "1px solid var(--orange-border)" : "1px solid var(--line)",
                            aspectRatio: "800 / 520",
                            opacity: i === cover ? 1 : 0.72,
                          }}
                          aria-label={p.caption || device.name}
                        >
                          <img src={p.src} alt={p.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="font-tele text-[10px] tracking-[0.14em] uppercase mt-4 text-center" style={{ color: "var(--txt-3)" }}>
                    {t.sol.photoHint}
                  </p>
                </>
              ) : (
                <div
                  className="hud flex items-center justify-center"
                  style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--panel-2)", aspectRatio: "800 / 520" }}
                >
                  <Icon className="w-14 h-14" style={{ color: "var(--cyan)", opacity: 0.4 }} />
                </div>
              )}
            </div>

            {/* ─── Описание ─── */}
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--cyan)" }} />
                </span>
                {device.badge && (
                  <span
                    className="font-tele text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-full"
                    style={{ background: "var(--orange-dim)", border: "1px solid var(--orange-border)", color: "var(--orange)" }}
                  >
                    {device.badge}
                  </span>
                )}
              </div>

              <h1
                className="font-display font-bold uppercase mb-3"
                style={{ color: "var(--txt)", fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.05, overflowWrap: "anywhere" }}
              >
                {device.name}
              </h1>
              {device.tagline && (
                <p className="font-tele text-[12px] tracking-[0.16em] uppercase mb-7" style={{ color: "var(--cyan)", overflowWrap: "anywhere" }}>
                  {device.tagline}
                </p>
              )}

              {device.description && (
                <p className="text-base leading-relaxed mb-8" style={{ color: "var(--txt-2)" }}>
                  {device.description}
                </p>
              )}

              {/* Ключевые характеристики */}
              {(device.highlights || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-9">
                  {device.highlights!.map((h) => (
                    <span
                      key={h}
                      className="font-tele text-[11px] px-3.5 py-2 rounded-full"
                      style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--txt-2)" }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {/* Цена — только по запросу */}
              <div
                className="hud flex items-center justify-between gap-4 p-5 mb-9 flex-wrap"
                style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)" }}
              >
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <Tag className="w-4 h-4 flex-shrink-0" style={{ color: "var(--orange)" }} />
                  <span className="font-display font-bold uppercase text-lg" style={{ color: "var(--txt)" }}>
                    {device.priceNote || t.sol.priceOnRequest}
                  </span>
                </div>
                <button
                  onClick={onRequest}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-transform duration-200 hover:translate-x-0.5"
                  style={{ background: "var(--orange)", color: "#0B1420" }}
                >
                  {t.sol.requestQuote}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Возможности */}
              {features.length > 0 && (
                <>
                  <h2 className="font-tele text-[11px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--txt-3)" }}>
                    {t.sol.capabilities}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                    {features.map((f) => {
                      const FIcon = getIcon(f.icon || "Shield");
                      return (
                        <div
                          key={f.title}
                          className="hud p-5"
                          style={{ borderRadius: "var(--r-md)", background: "var(--panel-2)", border: "1px solid var(--line)", boxShadow: "var(--card-shadow)", minWidth: 0 }}
                        >
                          <FIcon className="w-5 h-5 mb-3" style={{ color: "var(--cyan)" }} />
                          <div className="font-semibold text-sm mb-1" style={{ color: "var(--txt)" }}>{f.title}</div>
                          <div className="text-xs leading-relaxed" style={{ color: "var(--txt-2)" }}>{f.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── Технический паспорт ─── */}
          {specs.length > 0 && (
            <div className="mt-14">
              <h2 className="font-tele text-[11px] tracking-[0.2em] uppercase mb-5" style={{ color: "var(--txt-3)" }}>
                {t.sol.specs} · {device.name}
              </h2>
              <div
                className="hud force-dark overflow-hidden"
                style={{ borderRadius: "var(--r-lg)", background: "rgba(11,20,32,0.94)", border: "1px solid rgba(140,175,220,0.14)", boxShadow: "0 24px 60px rgba(2,8,18,0.45)" }}
              >
                <div className="grid md:grid-cols-2">
                  {specs.map((sp, i) => (
                    <div
                      key={sp.k + i}
                      className="font-tele flex items-start justify-between gap-4 px-6 py-4 text-[12px]"
                      style={{ borderBottom: "1px solid rgba(140,175,220,0.07)", minWidth: 0 }}
                    >
                      <span style={{ color: "rgba(178,198,226,0.5)", overflowWrap: "anywhere" }}>{sp.k}</span>
                      <span className="text-right font-medium" style={{ color: "rgba(234,242,252,0.94)", overflowWrap: "anywhere" }}>{sp.v}</span>
                    </div>
                  ))}
                </div>
                <div
                  className="font-tele flex items-center gap-2 px-6 py-4 text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "#3ddc84" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3ddc84", animation: "pulse-dot 1.8s infinite" }} />
                  {t.sol.certified}
                </div>
              </div>
            </div>
          )}

          {/* Кнопка «Назад» продублирована внизу — после длинного паспорта */}
          <div className="mt-10 flex justify-center">
            <div style={{ width: "100%", maxWidth: 340 }}><BackButton full /></div>
          </div>
        </div>
      </section>

      {lightbox !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          onIndex={(i) => { setLightbox(i); setCover(i); }}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
