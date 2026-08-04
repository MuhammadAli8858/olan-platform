// ══════════════════════════════════════════════════════════════════
// РЕДАКТОР КАТАЛОГА КОМПЛЕКСОВ
//
// Для каждой проблемы админ собирает свой набор приборов:
// добавить, удалить, поменять местами, загрузить фотографии,
// заполнить техпаспорт.
//
// Всё, что здесь меняется, разойдётся по остальным языкам сайта
// при сохранении (переводятся названия, описания и характеристики;
// фотографии, иконки и порядок — общие для всех языков).
//
// ⚠️ Компоненты объявлены НА УРОВНЕ ФАЙЛА. Если объявить их внутри
//    DeviceEditor, React будет пересоздавать поля ввода при каждой
//    перерисовке и фокус будет слетать после первой буквы.
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Upload, Image as ImageIcon,
  ArrowUp, ArrowDown, Package,
} from "lucide-react";

const ICONS = [
  "Radar", "Camera", "ScanLine", "Timer", "Cpu", "Database", "CloudRain",
  "AlertTriangle", "Shield", "Zap", "Radio", "Network", "Clock", "MapPin",
  "Gauge", "ParkingMeter", "TrainFront", "Bus", "Smartphone", "UserCheck",
];

/** Ссылка на картинку: загруженная лежит на сервере, внешняя — как есть */
function imgSrc(src: string, apiUrl: string) {
  if (!src) return "";
  return src.startsWith("http") || src.startsWith("/devices/") ? src : `${apiUrl}${src}`;
}

function Row({ label, children }: any) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/** Редактор простого списка строк (ключевые характеристики) */
function StringList({ items, onChange, placeholder }: any) {
  return (
    <>
      {(items || []).map((v: string, i: number) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder={placeholder}
            value={v}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button className="btn btn-danger btn-sm" onClick={() => onChange(items.filter((_: any, x: number) => x !== i))}>
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => onChange([...(items || []), ""])}>
        <Plus style={{ width: 12, height: 12 }} /> Добавить
      </button>
    </>
  );
}

/** Редактор списка объектов (характеристики, возможности) */
function ObjectList({ items, onChange, fields, blank, wide }: any) {
  return (
    <>
      {(items || []).map((item: any, i: number) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          {fields.map(([key, label]: any) =>
            key === "icon" ? (
              <select
                key={key}
                className="input"
                style={{ flex: "1 1 130px" }}
                value={item[key] || "Shield"}
                onChange={(e) => {
                  const next = structuredClone(items);
                  next[i][key] = e.target.value;
                  onChange(next);
                }}
              >
                {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            ) : (
              <input
                key={key}
                className="input"
                style={{ flex: wide?.includes(key) ? "3 1 240px" : "1 1 140px" }}
                placeholder={label}
                value={item[key] || ""}
                onChange={(e) => {
                  const next = structuredClone(items);
                  next[i][key] = e.target.value;
                  onChange(next);
                }}
              />
            )
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onChange(items.filter((_: any, x: number) => x !== i))}>
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => onChange([...(items || []), { ...blank }])}>
        <Plus style={{ width: 12, height: 12 }} /> Добавить
      </button>
    </>
  );
}

/** Фотографии прибора: загрузка, подпись, порядок, удаление */
function PhotoList({ photos, onChange, uploadImage, apiUrl, onError }: any) {
  return (
    <>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginBottom: 10 }}>
        {(photos || []).map((p: any, i: number) => (
          <div key={i} className="card" style={{ padding: 10 }}>
            <div style={{
              aspectRatio: "800 / 520", borderRadius: 8, overflow: "hidden", marginBottom: 8,
              background: "rgba(255,255,255,.03)", border: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {p.src ? (
                <img src={imgSrc(p.src, apiUrl)} alt={p.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageIcon style={{ width: 22, height: 22, color: "var(--txt-3)" }} />
              )}
            </div>

            <input
              className="input"
              style={{ marginBottom: 6, fontSize: 12 }}
              placeholder="Подпись к фото"
              value={p.caption || ""}
              onChange={(e) => {
                const next = structuredClone(photos);
                next[i].caption = e.target.value;
                onChange(next);
              }}
            />
            <input
              className="input"
              style={{ marginBottom: 6, fontSize: 11 }}
              placeholder="Путь или ссылка"
              value={p.src || ""}
              onChange={(e) => {
                const next = structuredClone(photos);
                next[i].src = e.target.value;
                onChange(next);
              }}
            />

            <div style={{ display: "flex", gap: 6 }}>
              <label className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                <Upload style={{ width: 12, height: 12 }} /> Заменить
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadImage(file);
                      const next = structuredClone(photos);
                      next[i].src = url;
                      onChange(next);
                    } catch (err: any) { onError(err.message); }
                  }} />
              </label>
              <button className="btn btn-danger btn-sm" onClick={() => onChange(photos.filter((_: any, x: number) => x !== i))}>
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="btn btn-ghost btn-sm">
        <Plus style={{ width: 12, height: 12 }} /> Загрузить фотографию
        <input type="file" accept="image/*" style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const url = await uploadImage(file);
              onChange([...(photos || []), { src: url, caption: "" }]);
            } catch (err: any) { onError(err.message); }
          }} />
      </label>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════

const blankDevice = () => ({
  id: "device-" + Date.now().toString(36),
  name: "Новый комплекс",
  tagline: "Тип прибора",
  icon: "Radar",
  badge: "",
  summary: "Короткое описание для карточки в каталоге.",
  description: "Полное описание прибора: что делает, где применяется, чем полезен заказчику.",
  highlights: [],
  specs: [],
  features: [],
  photos: [],
  priceNote: "Цена по запросу",
});

export function DeviceEditor({
  devices, onChange, uploadImage, apiUrl, onError,
}: {
  devices: any[];
  onChange: (next: any[]) => void;
  uploadImage: (f: File) => Promise<string>;
  apiUrl: string;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const list = devices || [];

  const update = (i: number, patch: any) => {
    const next = structuredClone(list);
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = structuredClone(list);
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
        <div>
          <span className="label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <Package style={{ width: 13, height: 13, color: "var(--orange)" }} />
            Каталог комплексов
          </span>
          <p style={{ fontSize: 12, color: "var(--txt-3)", margin: "5px 0 0", lineHeight: 1.55, maxWidth: 560 }}>
            Карточки приборов, которые показываются на странице этого решения вместо
            технического паспорта. Клиент нажимает на карточку и видит полную
            характеристику с фотографиями. Цену не указываем — везде «Цена по запросу».
          </p>
        </div>
        <button className="btn btn-sm" onClick={() => {
          const d = blankDevice();
          onChange([...list, d]);
          setOpen(d.id);
        }}>
          <Plus style={{ width: 13, height: 13 }} /> Добавить комплекс
        </button>
      </div>

      {list.length === 0 && (
        <div className="card" style={{ padding: 16, fontSize: 12, color: "var(--txt-3)", lineHeight: 1.6 }}>
          В каталоге пока нет комплексов. На сайте вместо карточек будет показано
          предложение запросить подбор оборудования.
        </div>
      )}

      {list.map((d: any, i: number) => {
        const isOpen = open === d.id;
        return (
          <div key={d.id || i} className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
            {/* ─── Свёрнутая строка ─── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--panel-3)", flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => setOpen(isOpen ? null : d.id)}>
                {isOpen ? <ChevronDown style={{ width: 13, height: 13 }} /> : <ChevronRight style={{ width: 13, height: 13 }} />}
              </button>

              <div style={{
                width: 46, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                background: "rgba(255,255,255,.03)", border: "1px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {d.photos?.[0]?.src
                  ? <img src={imgSrc(d.photos[0].src, apiUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <ImageIcon style={{ width: 13, height: 13, color: "var(--txt-3)" }} />}
              </div>

              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>
                {d.name || "Без названия"}
                {d.badge && <span className="badge badge-grey" style={{ marginLeft: 8 }}>{d.badge}</span>}
              </span>

              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Выше"
                  disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp style={{ width: 12, height: 12 }} />
                </button>
                <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} title="Ниже"
                  disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown style={{ width: 12, height: 12 }} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (!confirm(`Удалить комплекс «${d.name}» из каталога этого решения?`)) return;
                  onChange(list.filter((_: any, x: number) => x !== i));
                }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>

            {/* ─── Раскрытая карточка ─── */}
            {isOpen && (
              <div style={{ padding: 18 }}>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                  <Row label="Название прибора">
                    <input className="input" value={d.name || ""} onChange={(e) => update(i, { name: e.target.value })} />
                  </Row>
                  <Row label="Тип (подпись под названием)">
                    <input className="input" value={d.tagline || ""} onChange={(e) => update(i, { tagline: e.target.value })} />
                  </Row>
                  <Row label="Метка на карточке">
                    <input className="input" placeholder="Флагман, Мобильный…" value={d.badge || ""} onChange={(e) => update(i, { badge: e.target.value })} />
                  </Row>
                  <Row label="Иконка">
                    <select className="input" value={d.icon || "Radar"} onChange={(e) => update(i, { icon: e.target.value })}>
                      {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </Row>
                </div>

                <Row label="Краткое описание (текст на карточке в каталоге)">
                  <textarea className="input" rows={3} style={{ resize: "vertical" }}
                    value={d.summary || ""} onChange={(e) => update(i, { summary: e.target.value })} />
                </Row>

                <Row label="Полное описание (открывается при нажатии на карточку)">
                  <textarea className="input" rows={5} style={{ resize: "vertical" }}
                    value={d.description || ""} onChange={(e) => update(i, { description: e.target.value })} />
                </Row>

                <Row label="Надпись о цене">
                  <input className="input" value={d.priceNote || ""} placeholder="Цена по запросу"
                    onChange={(e) => update(i, { priceNote: e.target.value })} />
                </Row>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                  <span className="label">Ключевые характеристики (плашки на карточке)</span>
                  <StringList items={d.highlights} placeholder="до 6 полос" onChange={(v: any) => update(i, { highlights: v })} />
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                  <span className="label">Технический паспорт</span>
                  <ObjectList
                    items={d.specs}
                    fields={[["k", "Параметр"], ["v", "Значение"]]}
                    blank={{ k: "", v: "" }}
                    wide={["v"]}
                    onChange={(v: any) => update(i, { specs: v })}
                  />
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                  <span className="label">Возможности прибора</span>
                  <ObjectList
                    items={d.features}
                    fields={[["icon", "Иконка"], ["title", "Заголовок"], ["desc", "Описание"]]}
                    blank={{ icon: "Shield", title: "", desc: "" }}
                    wide={["desc"]}
                    onChange={(v: any) => update(i, { features: v })}
                  />
                </div>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
                  <span className="label">Фотографии прибора</span>
                  <p style={{ fontSize: 11, color: "var(--txt-3)", margin: "0 0 10px", lineHeight: 1.5 }}>
                    Первая фотография показывается на карточке в каталоге. На сайте
                    фото открывается на весь экран по нажатию.
                  </p>
                  <PhotoList
                    photos={d.photos}
                    apiUrl={apiUrl}
                    uploadImage={uploadImage}
                    onError={onError}
                    onChange={(v: any) => update(i, { photos: v })}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
