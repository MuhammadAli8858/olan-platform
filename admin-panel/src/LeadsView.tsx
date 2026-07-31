// ══════════════════════════════════════════════════════════════════
// ЗАЯВКИ С ФОРМЫ «ЗАПРОСИТЬ КОНСУЛЬТАЦИЮ»
//
// Экран для менеджера и администратора:
//   менеджер — заявки своих операторов
//   админ    — все заявки платформы
//
// Видно, какому оператору назначена заявка и обращался ли этот
// клиент раньше в чат. Отмечать обработанной может и менеджер,
// и админ — это общий журнал обращений.
//
// Сама карточка заявки — общий компонент LeadCard: каждое поле
// клиента в своей рамке, длинный текст переносится внутри неё.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { api } from "./lib";
import { LeadCard, type Lead } from "./LeadCard";

export function LeadsView({ title = "Заявки с сайта" }: { title?: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "done">("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLeads(await api("/api/leads"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // обновляем сами каждые 15 секунд
    return () => clearInterval(id);
  }, []);

  const markDone = async (id: string) => {
    try {
      await api(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "done" } : l)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const shown = leads.filter((l) =>
    filter === "all" ? true : filter === "new" ? l.status === "new" : l.status !== "new"
  );
  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* ─── Заголовок и фильтры ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Inbox style={{ width: 20, height: 20, color: "var(--orange)", flexShrink: 0 }} />
            {title}
            {newCount > 0 && <span className="badge badge-red">{newCount} новых</span>}
          </h2>
          <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "6px 0 0" }}>
            Обращения с формы «Запросить бесплатную консультацию». Рядом с каждой видно,
            какому оператору она назначена.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([
            ["all", `Все (${leads.length})`],
            ["new", `Новые (${newCount})`],
            ["done", `Обработанные (${leads.length - newCount})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${filter === key ? "" : "btn-ghost"}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: "var(--txt-3)", fontSize: 13 }}>Загрузка…</div>}

      {!loading && shown.length === 0 && (
        <div className="card" style={{ padding: 24, color: "var(--txt-3)", fontSize: 13, lineHeight: 1.6 }}>
          {leads.length === 0
            ? "Заявок пока нет. Обращения с формы на сайте будут появляться здесь."
            : "В этой категории заявок нет."}
        </div>
      )}

      {/* ─── Список заявок ─── */}
      <div className="lead-grid">
        {shown.map((l) => (
          <LeadCard key={l.id} lead={l} onMarkDone={markDone} showAssignee />
        ))}
      </div>
    </div>
  );
}
