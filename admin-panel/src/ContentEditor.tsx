// ══════════════════════════════════════════════════════════════════
// РЕДАКТОР САЙТА
//
// Здесь меняется всё содержимое главного сайта без правки кода:
//   • Компания      — название, телефон, почта, адрес, описание
//   • Главный экран — заголовки и подводка
//   • Проблемы      — добавить/изменить/удалить проблему и её решение,
//                     а также КАТАЛОГ КОМПЛЕКСОВ внутри решения:
//                     карточки приборов с фотографиями и техпаспортом
//   • География     — страны на карте и города-маркеры
//   • Проекты       — реализованные кейсы
//   • Партнёры      — логотип, название, описание
//   • Цифры         — полоса доверия и этапы внедрения
//
// ⭐ ГЛАВНОЕ: правки применяются СРАЗУ КО ВСЕМ 9 ЯЗЫКАМ.
//    Добавили проблему или партнёра — они появятся во всех языках.
//    Изменили текст — он разойдётся по всем языкам (переведётся,
//    если в настройках сервера включён переводчик, иначе скопируется).
//    Переводы, сделанные вручную, при этом НЕ затираются.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  Save, Plus, Trash2, Copy, Building2, LayoutTemplate, ListTree,
  Globe2, Briefcase, Handshake, BarChart3, Upload, ChevronDown, ChevronRight,
  Languages, RefreshCw, Check,
} from "lucide-react";
import { api, API_URL, loadSession } from "./lib";
import { DeviceEditor } from "./DeviceEditor";

const LANG_NAMES: Record<string, string> = {
  ru: "Русский", uz: "O'zbekcha", en: "English", zh: "中文", ar: "العربية",
};

const ICONS = [
  "Gauge", "StopCircle", "ParkingMeter", "Bus", "BusFront", "TrainFront",
  "Smartphone", "UserCheck", "BarChart3", "FileText", "Radar", "Cpu",
  "Database", "CloudRain", "Timer", "Camera", "ScanLine", "MapPin",
  "Network", "Shield", "Zap", "Radio", "AlertTriangle", "Clock", "RectangleHorizontal",
];

type Section = "company" | "hero" | "problems" | "geo" | "projects" | "partners" | "numbers";

// ══════════════════════════════════════════════════════════════════
// ВАЖНО: эти два компонента объявлены НА УРОВНЕ ФАЙЛА, а не внутри
// ContentEditor. Если объявить их внутри, React считает их новым
// типом компонента при каждой перерисовке, пересоздаёт поле ввода —
// и фокус слетает после первой введённой буквы.
// ══════════════════════════════════════════════════════════════════

function Field({ label, value, onChange, textarea = false, placeholder = "" }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea
          className="input"
          rows={4}
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ resize: "vertical" }}
        />
      ) : (
        <input
          className="input"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Card({ children }: any) {
  return <div className="card" style={{ padding: 20, marginBottom: 14 }}>{children}</div>;
}

export function ContentEditor() {
  const [langs, setLangs] = useState<string[]>([]);
  const [lang, setLang] = useState("ru");
  const [all, setAll] = useState<any>({});
  const [data, setData] = useState<any>(null);
  const [section, setSection] = useState<Section>("company");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);
  // применять правки ко всем языкам сайта (включено по умолчанию)
  const [syncAll, setSyncAll] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trStatus, setTrStatus] = useState<{ provider: string; enabled: boolean } | null>(null);

  // ─── Загрузка ───
  const load = async () => {
    try {
      const res = await api("/api/content/all");
      setLangs(res.langs);
      setAll(res.content);
      setData(res.content[lang] ? structuredClone(res.content[lang]) : null);
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => {
    load();
    api("/api/content/translation-status").then(setTrStatus).catch(() => {});
  }, []);
  useEffect(() => {
    if (all[lang]) setData(structuredClone(all[lang]));
    else setData(null);
  }, [lang, all]);

  // ─── Сохранение ───
  // Сохранение. По умолчанию правки расходятся по всем языкам сайта.
  const save = async () => {
    setSaving(true); setError("");
    try {
      const res = await api(`/api/content/${lang}?propagate=${syncAll}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (syncAll) {
        const kept = Object.values(res.report || {}).reduce((n: number, r: any) => n + (r.keptManual || 0), 0);
        setStatus(
          res.translated
            ? `Сохранено и переведено на все языки сайта ✓${kept ? ` (ручных переводов сохранено: ${kept})` : ""}`
            : `Сохранено и разнесено по всем языкам сайта ✓${kept ? ` (ручных переводов сохранено: ${kept})` : ""}`
        );
      } else {
        setStatus(`Сохранено только для языка «${LANG_NAMES[lang]}» ✓`);
      }
      setTimeout(() => setStatus(""), 5000);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Перевести всё заново с текущего языка (перезапишет и ручные переводы)
  const retranslateAll = async () => {
    if (!confirm(
      `Перевести все языки заново с языка «${LANG_NAMES[lang]}»?\n\n` +
      `Внимание: переводы, сделанные вручную на других языках, будут перезаписаны.`
    )) return;
    setSaving(true); setError("");
    try {
      const res = await api(`/api/content/${lang}/retranslate`, { method: "POST" });
      setStatus(res.translated ? "Все языки переведены заново ✓" : "Все языки заполнены заново ✓");
      setTimeout(() => setStatus(""), 5000);
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Заполнить пустой язык из русского (нужно только при самом первом запуске)
  const fillFromRu = async () => {
    try {
      await api(`/api/content/ru/retranslate`, { method: "POST" });
      await load();
      setStatus("Все языки заполнены ✓");
      setTimeout(() => setStatus(""), 3500);
    } catch (e: any) { setError(e.message); }
  };

  // ─── Загрузка картинки на сервер ───
  const uploadImage = async (file: File): Promise<string> => {
    const session = loadSession();
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.token}` },
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Не удалось загрузить файл");
    return json.url;
  };

  // ─── Помощники изменения данных ───
  const setField = (path: string[], value: any) => {
    setData((prev: any) => {
      const next = structuredClone(prev);
      let node = next;
      for (let i = 0; i < path.length - 1; i++) node = node[path[i]];
      node[path[path.length - 1]] = value;
      return next;
    });
  };

  const addTo = (key: string, item: any) =>
    setData((prev: any) => ({ ...prev, [key]: [...(prev[key] || []), item] }));

  const removeFrom = (key: string, index: number) =>
    setData((prev: any) => ({ ...prev, [key]: prev[key].filter((_: any, i: number) => i !== index) }));

  if (!data) {
    return (
      <div style={{ padding: 40, maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
        <h2 className="display" style={{ fontSize: 22 }}>Перевод на «{LANG_NAMES[lang]}» ещё не создан</h2>
        <p style={{ color: "var(--txt-2)", fontSize: 14, lineHeight: 1.6, margin: "12px 0 22px" }}>
          Обычно этого не бывает: правки автоматически расходятся по всем языкам.
          Нажмите кнопку ниже — все языки заполнятся из русской версии.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <select className="input" style={{ width: 190 }} value={lang} onChange={(e) => setLang(e.target.value)}>
            {langs.map((l) => <option key={l} value={l}>{LANG_NAMES[l] || l}</option>)}
          </select>
          <button className="btn" onClick={fillFromRu}>
            <Copy style={{ width: 14, height: 14 }} /> Заполнить все языки из русского
          </button>
        </div>
        {error && <div className="error-box" style={{ marginTop: 18 }}>{error}</div>}
      </div>
    );
  }

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: "company", label: "Компания", icon: Building2 },
    { id: "hero", label: "Главный экран", icon: LayoutTemplate },
    { id: "problems", label: "Проблемы и решения", icon: ListTree },
    { id: "geo", label: "География", icon: Globe2 },
    { id: "projects", label: "Проекты", icon: Briefcase },
    { id: "partners", label: "Партнёры", icon: Handshake },
    { id: "numbers", label: "Цифры и этапы", icon: BarChart3 },
  ];

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* ─── Панель управления ─── */}
      <div className="card" style={{ padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label className="label" style={{ marginBottom: 4 }}>Язык страницы</label>
          <select className="input" style={{ width: 180 }} value={lang} onChange={(e) => setLang(e.target.value)}>
            {langs.map((l) => (
              <option key={l} value={l}>{LANG_NAMES[l] || l}{all[l] ? "" : " (нет перевода)"}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {status && <span className="badge badge-green">{status}</span>}

        <button className="btn btn-ghost btn-sm" onClick={retranslateAll} disabled={saving}>
          <RefreshCw style={{ width: 13, height: 13 }} /> Перевести всё заново
        </button>

        <button className="btn" onClick={save} disabled={saving}>
          <Save style={{ width: 15, height: 15 }} /> {saving ? "Сохранение…" : "Сохранить изменения"}
        </button>
      </div>

      {/* ─── Полоса синхронизации языков ─── */}
      <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={syncAll}
            onChange={(e) => setSyncAll(e.target.checked)}
            style={{ width: 17, height: 17, accentColor: "var(--orange)", cursor: "pointer" }}
          />
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600 }}>
            <Languages style={{ width: 15, height: 15, color: "var(--orange)" }} />
            Применять изменения ко всем языкам сайта
          </span>
        </label>

        <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: "var(--txt-2)", lineHeight: 1.5 }}>
          {syncAll ? (
            trStatus?.enabled
              ? <>Текст будет переведён автоматически ({trStatus.provider}). Переводы, сделанные вручную, сохранятся.</>
              : <>Автоперевод выключен — текст скопируется на все языки, потом его можно перевести вручную. Включается в <code>server/src/config.js</code>.</>
          ) : (
            <>Изменения сохранятся только для языка «{LANG_NAMES[lang]}» и не затронут остальные.</>
          )}
        </div>

        {/* какие языки заполнены */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {langs.map((l) => (
            <span
              key={l}
              className={`badge ${all[l] ? "badge-green" : "badge-grey"}`}
              style={{ padding: "3px 8px", fontSize: 10 }}
              title={all[l] ? "Язык заполнен" : "Язык пуст — покажется русская версия"}
            >
              {all[l] && <Check style={{ width: 9, height: 9 }} />}
              {l.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ─── Разделы ─── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`btn btn-sm ${section === id ? "" : "btn-ghost"}`} onClick={() => setSection(id)}>
            <Icon style={{ width: 13, height: 13 }} /> {label}
          </button>
        ))}
      </div>

      {/* ═══ КОМПАНИЯ ═══ */}
      {section === "company" && (
        <Card>
          <h3 className="display" style={{ fontSize: 18, margin: "0 0 16px" }}>Данные компании</h3>
          <Field label="Название" value={data.company?.name} onChange={(v: string) => setField(["company", "name"], v)} />
          <Field label="Слоган под названием" value={data.company?.slogan} onChange={(v: string) => setField(["company", "slogan"], v)} />
          <Field label="Телефон" value={data.company?.phone} onChange={(v: string) => setField(["company", "phone"], v)} />
          <Field label="Электронная почта" value={data.company?.email} onChange={(v: string) => setField(["company", "email"], v)} />
          <Field label="Адрес" value={data.company?.address} onChange={(v: string) => setField(["company", "address"], v)} />
          <Field label="Строка статуса в шапке" value={data.company?.statusLine} onChange={(v: string) => setField(["company", "statusLine"], v)} />
          <Field label="Описание компании (подвал и блок географии)" textarea value={data.company?.about} onChange={(v: string) => setField(["company", "about"], v)} />
        </Card>
      )}

      {/* ═══ ГЛАВНЫЙ ЭКРАН ═══ */}
      {section === "hero" && (
        <Card>
          <h3 className="display" style={{ fontSize: 18, margin: "0 0 16px" }}>Главный экран</h3>
          <Field label="Надпись в рамке сверху" value={data.hero?.badge} onChange={(v: string) => setField(["hero", "badge"], v)} />
          <Field label="Заголовок — первая строка" value={data.hero?.titleLine1} onChange={(v: string) => setField(["hero", "titleLine1"], v)} />
          <Field label="Заголовок — оранжевое слово" value={data.hero?.titleAccent} onChange={(v: string) => setField(["hero", "titleAccent"], v)} />
          <Field label="Заголовок — третья строка" value={data.hero?.titleLine3} onChange={(v: string) => setField(["hero", "titleLine3"], v)} />
          <Field label="Подводка под заголовком" textarea value={data.hero?.lead} onChange={(v: string) => setField(["hero", "lead"], v)} />
        </Card>
      )}

      {/* ═══ ПРОБЛЕМЫ И РЕШЕНИЯ ═══ */}
      {section === "problems" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--txt-2)", margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
              Каждая проблема — это карточка на главной и отдельная страница решения.
              Раскройте карточку, чтобы отредактировать текст проблемы и всё решение целиком.
            </p>
            <button className="btn btn-sm" onClick={() => {
              const id = "solution-" + Date.now().toString(36);
              addTo("problems", { id, code: "NEW-00", icon: "Shield", title: "Новая проблема", short: "Краткое описание проблемы" });
              setData((prev: any) => ({
                ...prev,
                solutions: {
                  ...prev.solutions,
                  [id]: {
                    heroAccent: "акцент", heroRest: "Заголовок страницы —", heroLead: "Подводка о проблеме.",
                    stats: [], productName: "OHT-000", solutionTitle: "Название решения",
                    sellText: "Продающее описание решения.", features: [], specs: [], results: [],
                    ctaLine: "Призыв к действию.",
                    catalogTitle: "Комплексы для этой задачи",
                    catalogLead: "Нажмите на карточку, чтобы посмотреть характеристики и техпаспорт. Стоимость — по запросу.",
                    devices: [],
                  },
                },
              }));
              setOpenItem(id);
            }}>
              <Plus style={{ width: 14, height: 14 }} /> Добавить проблему
            </button>
          </div>

          {(data.problems || []).map((p: any, i: number) => {
            const sol = data.solutions?.[p.id] || {};
            const isOpen = openItem === p.id;
            return (
              <div key={p.id} className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "var(--panel-3)" }}>
                  <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => setOpenItem(isOpen ? null : p.id)}>
                    {isOpen ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                  </button>
                  <span className="tele badge badge-grey">{p.code}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => {
                    if (!confirm(`Удалить проблему «${p.title}» вместе со страницей решения?`)) return;
                    removeFrom("problems", i);
                    setData((prev: any) => {
                      const next = structuredClone(prev);
                      delete next.solutions[p.id];
                      return next;
                    });
                  }}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>

                {isOpen && (
                  <div style={{ padding: 20 }}>
                    {/* карточка проблемы */}
                    <h4 className="display" style={{ fontSize: 15, margin: "0 0 12px", color: "var(--cyan)" }}>Карточка на главной</h4>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                      <Field label="Код (SPD-01)" value={p.code} onChange={(v: string) => setField(["problems", String(i), "code"], v)} />
                      <div style={{ marginBottom: 14 }}>
                        <label className="label">Иконка</label>
                        <select className="input" value={p.icon} onChange={(e) => setField(["problems", String(i), "icon"], e.target.value)}>
                          {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                        </select>
                      </div>
                    </div>
                    <Field label="Заголовок проблемы" value={p.title} onChange={(v: string) => setField(["problems", String(i), "title"], v)} />
                    <Field label="Краткое описание" textarea value={p.short} onChange={(v: string) => setField(["problems", String(i), "short"], v)} />

                    {/* страница решения */}
                    <h4 className="display" style={{ fontSize: 15, margin: "22px 0 12px", color: "var(--cyan)" }}>Страница решения</h4>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <Field label="Заголовок — обычная часть" value={sol.heroRest} onChange={(v: string) => setField(["solutions", p.id, "heroRest"], v)} />
                      <Field label="Заголовок — оранжевая часть" value={sol.heroAccent} onChange={(v: string) => setField(["solutions", p.id, "heroAccent"], v)} />
                    </div>
                    <Field label="Подводка о проблеме" textarea value={sol.heroLead} onChange={(v: string) => setField(["solutions", p.id, "heroLead"], v)} />

                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <Field label="Название продукта" value={sol.productName} onChange={(v: string) => setField(["solutions", p.id, "productName"], v)} />
                      <Field label="Заголовок решения" value={sol.solutionTitle} onChange={(v: string) => setField(["solutions", p.id, "solutionTitle"], v)} />
                    </div>
                    <Field label="Продающий текст" textarea value={sol.sellText} onChange={(v: string) => setField(["solutions", p.id, "sellText"], v)} />
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                      <Field label="Заголовок каталога комплексов" value={sol.catalogTitle} onChange={(v: string) => setField(["solutions", p.id, "catalogTitle"], v)} placeholder="Комплексы для контроля скорости" />
                    </div>
                    <Field label="Подводка к каталогу" textarea value={sol.catalogLead} onChange={(v: string) => setField(["solutions", p.id, "catalogLead"], v)} placeholder="Нажмите на карточку, чтобы посмотреть техпаспорт. Стоимость — по запросу." />
                    <Field label="Призыв к действию внизу страницы" textarea value={sol.ctaLine} onChange={(v: string) => setField(["solutions", p.id, "ctaLine"], v)} />

                    {/* списки внутри решения */}
                    {[
                      { key: "stats", title: "Факты о проблеме", fields: [["value", "Цифра"], ["fact", "Факт"], ["source", "Источник"]], blank: { value: "", fact: "", source: "" } },
                      { key: "features", title: "Преимущества", fields: [["title", "Заголовок"], ["desc", "Описание"], ["icon", "Иконка"]], blank: { icon: "Shield", title: "", desc: "" } },
                      { key: "results", title: "Результаты", fields: [["value", "Цифра"], ["label", "Описание"]], blank: { value: "", label: "" } },
                    ].map(({ key, title, fields, blank }) => (
                      <div key={key} style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span className="label" style={{ margin: 0 }}>{title}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() =>
                            setField(["solutions", p.id, key], [...(sol[key] || []), { ...blank }])
                          }>
                            <Plus style={{ width: 12, height: 12 }} /> Добавить
                          </button>
                        </div>
                        {(sol[key] || []).map((item: any, j: number) => (
                          <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                            {fields.map(([fk, flabel]) => (
                              <input
                                key={fk}
                                className="input"
                                style={{ flex: fk === "fact" || fk === "desc" || fk === "label" ? "3 1 220px" : "1 1 120px" }}
                                placeholder={flabel}
                                value={item[fk] || ""}
                                onChange={(e) => {
                                  const list = structuredClone(sol[key]);
                                  list[j][fk] = e.target.value;
                                  setField(["solutions", p.id, key], list);
                                }}
                              />
                            ))}
                            <button className="btn btn-danger btn-sm" onClick={() =>
                              setField(["solutions", p.id, key], sol[key].filter((_: any, x: number) => x !== j))
                            }>
                              <Trash2 style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* ─── Каталог комплексов для этого решения ─── */}
                    <DeviceEditor
                      devices={sol.devices || []}
                      apiUrl={API_URL}
                      uploadImage={uploadImage}
                      onError={setError}
                      onChange={(next) => setField(["solutions", p.id, "devices"], next)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ═══ ГЕОГРАФИЯ ═══ */}
      {section === "geo" && (
        <>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Страны на карте</h3>
              <button className="btn btn-sm" onClick={() => addTo("countries", { name: "", iso: "" })}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить страну
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--txt-3)", margin: "0 0 14px", lineHeight: 1.6 }}>
              Код ISO — трёхзначный номер страны, по нему она подсвечивается на карте.
              Например: Узбекистан 860, Казахстан 398, Россия 643, Беларусь 112, Таджикистан 762,
              Кыргызстан 417, Азербайджан 031, Армения 051, Молдова 498, Туркменистан 795,
              Турция 792, ОАЭ 784, Германия 276, Китай 156.
            </p>
            {(data.countries || []).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" style={{ flex: 3 }} placeholder="Название страны" value={c.name || ""}
                  onChange={(e) => setField(["countries", String(i), "name"], e.target.value)} />
                <input className="input" style={{ flex: 1 }} placeholder="ISO (860)" value={c.iso || ""}
                  onChange={(e) => setField(["countries", String(i), "iso"], e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("countries", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Города-маркеры на карте</h3>
              <button className="btn btn-sm" onClick={() => addTo("projectMarkers", { name: "", coordinates: [0, 0] })}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить город
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--txt-3)", margin: "0 0 14px" }}>
              Координаты: сначала долгота, потом широта. Например, Ташкент: 69.24 и 41.31.
            </p>
            {(data.projectMarkers || []).map((m: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" style={{ flex: 3 }} placeholder="Город" value={m.name || ""}
                  onChange={(e) => setField(["projectMarkers", String(i), "name"], e.target.value)} />
                <input className="input" style={{ flex: 1 }} placeholder="Долгота" value={m.coordinates?.[0] ?? ""}
                  onChange={(e) => setField(["projectMarkers", String(i), "coordinates"], [Number(e.target.value) || 0, m.coordinates?.[1] || 0])} />
                <input className="input" style={{ flex: 1 }} placeholder="Широта" value={m.coordinates?.[1] ?? ""}
                  onChange={(e) => setField(["projectMarkers", String(i), "coordinates"], [m.coordinates?.[0] || 0, Number(e.target.value) || 0])} />
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("projectMarkers", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ═══ ПРОЕКТЫ ═══ */}
      {section === "projects" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 className="display" style={{ fontSize: 20, margin: 0 }}>Реализованные проекты</h3>
            <button className="btn btn-sm" onClick={() => addTo("projects", {
              flag: "🏳️", country: "", city: "", title: "", desc: "", metrics: [{ v: "", l: "" }],
            })}>
              <Plus style={{ width: 14, height: 14 }} /> Добавить проект
            </button>
          </div>

          {(data.projects || []).map((pr: any, i: number) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="badge badge-grey">Проект {i + 1}</span>
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("projects", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} /> Удалить
                </button>
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <Field label="Флаг (эмодзи)" value={pr.flag} onChange={(v: string) => setField(["projects", String(i), "flag"], v)} />
                <Field label="Страна" value={pr.country} onChange={(v: string) => setField(["projects", String(i), "country"], v)} />
                <Field label="Город" value={pr.city} onChange={(v: string) => setField(["projects", String(i), "city"], v)} />
              </div>
              <Field label="Название проекта" value={pr.title} onChange={(v: string) => setField(["projects", String(i), "title"], v)} />
              <Field label="Описание" textarea value={pr.desc} onChange={(v: string) => setField(["projects", String(i), "desc"], v)} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 10px" }}>
                <span className="label" style={{ margin: 0 }}>Показатели проекта</span>
                <button className="btn btn-ghost btn-sm" onClick={() =>
                  setField(["projects", String(i), "metrics"], [...(pr.metrics || []), { v: "", l: "" }])
                }>
                  <Plus style={{ width: 12, height: 12 }} /> Добавить
                </button>
              </div>
              {(pr.metrics || []).map((m: any, j: number) => (
                <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Цифра (120)" value={m.v || ""}
                    onChange={(e) => {
                      const list = structuredClone(pr.metrics); list[j].v = e.target.value;
                      setField(["projects", String(i), "metrics"], list);
                    }} />
                  <input className="input" style={{ flex: 2 }} placeholder="Подпись (комплексов)" value={m.l || ""}
                    onChange={(e) => {
                      const list = structuredClone(pr.metrics); list[j].l = e.target.value;
                      setField(["projects", String(i), "metrics"], list);
                    }} />
                  <button className="btn btn-danger btn-sm" onClick={() =>
                    setField(["projects", String(i), "metrics"], pr.metrics.filter((_: any, x: number) => x !== j))
                  }>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </Card>
          ))}
        </>
      )}

      {/* ═══ ПАРТНЁРЫ ═══ */}
      {section === "partners" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 className="display" style={{ fontSize: 20, margin: 0 }}>Технологические партнёры</h3>
            <button className="btn btn-sm" onClick={() => addTo("partners", { name: "", tag: "", description: "", logo: "" })}>
              <Plus style={{ width: 14, height: 14 }} /> Добавить партнёра
            </button>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {(data.partners || []).map((p: any, i: number) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                {/* предпросмотр логотипа */}
                <div style={{
                  height: 110, marginBottom: 14, borderRadius: 12,
                  background: "rgba(255,255,255,.03)", border: "1px solid var(--line)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 12, overflow: "hidden",
                }}>
                  {p.logo ? (
                    <img src={p.logo.startsWith("http") ? p.logo : `${API_URL}${p.logo}`} alt={p.name}
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--txt-3)" }}>Логотип не загружен</span>
                  )}
                </div>

                <label className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 14 }}>
                  <Upload style={{ width: 13, height: 13 }} /> Загрузить логотип или фото
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try { setField(["partners", String(i), "logo"], await uploadImage(file)); }
                      catch (err: any) { setError(err.message); }
                    }} />
                </label>

                <Field label="Название партнёра" value={p.name} onChange={(v: string) => setField(["partners", String(i), "name"], v)} />
                <Field label="Направление (подпись)" value={p.tag} onChange={(v: string) => setField(["partners", String(i), "tag"], v)} />
                <Field label="Описание партнёра" textarea value={p.description} onChange={(v: string) => setField(["partners", String(i), "description"], v)} />
                <Field label="Или ссылка на логотип (если внешняя)" value={p.logo} onChange={(v: string) => setField(["partners", String(i), "logo"], v)} placeholder="https://…" />

                <button className="btn btn-danger btn-sm" style={{ width: "100%" }} onClick={() => {
                  if (!confirm(`Удалить партнёра «${p.name}»?`)) return;
                  removeFrom("partners", i);
                }}>
                  <Trash2 style={{ width: 13, height: 13 }} /> Удалить партнёра
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ ЦИФРЫ И ЭТАПЫ ═══ */}
      {section === "numbers" && (
        <>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Полоса цифр на главной</h3>
              <button className="btn btn-sm" onClick={() => addTo("stats", { value: "", label: "" })}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить
              </button>
            </div>
            {(data.stats || []).map((s: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="3400+" value={s.value || ""}
                  onChange={(e) => setField(["stats", String(i), "value"], e.target.value)} />
                <input className="input" style={{ flex: 3 }} placeholder="Установленных комплексов" value={s.label || ""}
                  onChange={(e) => setField(["stats", String(i), "label"], e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("stats", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Этапы внедрения</h3>
              <button className="btn btn-sm" onClick={() => addTo("processSteps", { step: "05", title: "", desc: "" })}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить этап
              </button>
            </div>
            {(data.processSteps || []).map((s: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                <input className="input" style={{ flex: "0 0 70px" }} placeholder="01" value={s.step || ""}
                  onChange={(e) => setField(["processSteps", String(i), "step"], e.target.value)} />
                <input className="input" style={{ flex: 2 }} placeholder="Название этапа" value={s.title || ""}
                  onChange={(e) => setField(["processSteps", String(i), "title"], e.target.value)} />
                <textarea className="input" rows={2} style={{ flex: 4, resize: "vertical" }} placeholder="Описание" value={s.desc || ""}
                  onChange={(e) => setField(["processSteps", String(i), "desc"], e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("processSteps", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Лента фиксаций (демо в шапке сайта)</h3>
              <button className="btn btn-sm" onClick={() => addTo("detections", { plate: "", type: "", value: "", zone: "" })}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить строку
              </button>
            </div>
            {(data.detections || []).map((d: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {["plate", "type", "value", "zone"].map((k) => (
                  <input key={k} className="input" placeholder={k} value={d[k] || ""}
                    onChange={(e) => setField(["detections", String(i), k], e.target.value)} />
                ))}
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("detections", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Сертификаты</h3>
              <button className="btn btn-sm" onClick={() => addTo("certs", "")}>
                <Plus style={{ width: 14, height: 14 }} /> Добавить
              </button>
            </div>
            {(data.certs || []).map((c: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" value={c} placeholder="ISO 9001:2015"
                  onChange={(e) => setField(["certs", String(i)], e.target.value)} />
                <button className="btn btn-danger btn-sm" onClick={() => removeFrom("certs", i)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
