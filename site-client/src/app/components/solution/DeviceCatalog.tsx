// ══════════════════════════════════════════════════════════════════
// КАТАЛОГ КОМПЛЕКСОВ ДЛЯ РЕШЕНИЯ
//
// Заменил собой одиночный «технический паспорт»: на странице каждого
// решения показываются карточки приборов, которые эту задачу
// закрывают. Нажатие на карточку открывает полную характеристику
// (компонент DeviceDetail) с самого верха страницы.
//
// Цены в карточках нет — только «Цена по запросу».
// Состав каталога редактируется в админ-панели.
// ══════════════════════════════════════════════════════════════════

import { ArrowRight, Tag } from "lucide-react";
import { useLang } from "../../i18n/LangContext";
import { getIcon } from "../../lib/icons";
import type { Device } from "./DeviceDetail";

export function DeviceCatalog({
  devices, title, lead, onOpen,
}: {
  devices: Device[];
  title?: string;
  lead?: string;
  onOpen: (d: Device) => void;
}) {
  const { t } = useLang();

  if (!devices?.length) {
    return (
      <div
        className="hud p-8 text-center"
        style={{ borderRadius: "var(--r-lg)", background: "var(--panel-2)", border: "1px solid var(--line)" }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "var(--txt-2)" }}>{t.sol.devicesEmpty}</p>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Шапка каталога ─── */}
      <div className="mb-8">
        <div className="font-tele text-[11px] tracking-[0.2em] uppercase mb-3 flex items-center gap-2.5" style={{ color: "var(--cyan)" }}>
          <span className="w-6 h-px" style={{ background: "var(--cyan)" }} />
          {t.sol.catalog}
        </div>
        {title && (
          <h2
            className="font-display font-bold uppercase mb-3"
            style={{ color: "var(--txt)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.12 }}
          >
            {title}
          </h2>
        )}
        {lead && (
          <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--txt-2)" }}>{lead}</p>
        )}
      </div>

      {/* ─── Карточки приборов ─── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))" }}
      >
        {devices.map((d) => {
          const Icon = getIcon(d.icon || "Radar");
          const cover = d.photos?.[0];

          return (
            <button
              key={d.id}
              onClick={() => onOpen(d)}
              className="hud group text-left flex flex-col overflow-hidden transition-all duration-250"
              style={{
                borderRadius: "var(--r-lg)",
                background: "var(--panel-2)",
                border: "1px solid var(--line)",
                boxShadow: "var(--card-shadow)",
                minWidth: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--orange-border)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "none"; }}
            >
              {/* Фото прибора */}
              <div className="relative" style={{ aspectRatio: "800 / 520", background: "var(--void)", overflow: "hidden" }}>
                {cover ? (
                  <img
                    src={cover.src}
                    alt={d.name}
                    loading="lazy"
                    className="transition-transform duration-500 group-hover:scale-105"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="w-10 h-10" style={{ color: "var(--cyan)", opacity: 0.35 }} />
                  </div>
                )}
                {d.badge && (
                  <span
                    className="absolute top-3 left-3 font-tele text-[9px] tracking-[0.16em] uppercase px-2.5 py-1.5 rounded-full"
                    style={{ background: "rgba(11,20,32,0.9)", border: "1px solid var(--orange-border)", color: "var(--orange)" }}
                  >
                    {d.badge}
                  </span>
                )}
              </div>

              {/* Текст карточки */}
              <div className="p-6 flex flex-col flex-1" style={{ minWidth: 0 }}>
                <div className="flex items-start gap-2.5 mb-2">
                  <Icon className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: "var(--cyan)" }} />
                  <h3
                    className="font-display font-bold uppercase text-xl"
                    style={{ color: "var(--txt)", lineHeight: 1.12, overflowWrap: "anywhere" }}
                  >
                    {d.name}
                  </h3>
                </div>

                {d.tagline && (
                  <p className="font-tele text-[10px] tracking-[0.14em] uppercase mb-4" style={{ color: "var(--txt-3)", overflowWrap: "anywhere" }}>
                    {d.tagline}
                  </p>
                )}

                {d.summary && (
                  <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--txt-2)" }}>{d.summary}</p>
                )}

                {(d.highlights || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {d.highlights!.slice(0, 4).map((h) => (
                      <span
                        key={h}
                        className="font-tele text-[10px] px-2.5 py-1.5 rounded-full"
                        style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)", color: "var(--cyan)" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Низ карточки: цена по запросу + переход */}
                <div
                  className="mt-auto pt-4 flex items-center justify-between gap-3 flex-wrap"
                  style={{ borderTop: "1px solid var(--line-soft, var(--line))" }}
                >
                  <span className="font-tele text-[10px] tracking-[0.14em] uppercase flex items-center gap-1.5" style={{ color: "var(--txt-3)" }}>
                    <Tag className="w-3 h-3" />
                    {d.priceNote || t.sol.priceOnRequest}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--orange)" }}>
                    {t.sol.openCard}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
