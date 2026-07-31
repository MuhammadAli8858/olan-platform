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
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  Inbox, RefreshCw, CheckCircle, Circle, User as UserIcon,
  Mail, Phone, Building2, MessageSquare, Clock,
} from "lucide-react";
import { api, fmtDate } from "./lib";

type Lead = {
  id: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
  lang: string;
  operatorId: string | null;
  operatorName: string;
  managerName: string;
  hasChat: boolean;
};

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
        <div>
          <h2 className="display" style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Inbox style={{ width: 20, height: 20, color: "var(--orange)" }} />
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
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {shown.map((l) => (
          <div key={l.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
            {/* статус и дата */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
              <span className={`badge ${l.status === "new" ? "badge-orange" : "badge-green"}`}>
                {l.status === "new"
                  ? <><Circle style={{ width: 10, height: 10 }} /> Новая</>
                  : <><CheckCircle style={{ width: 10, height: 10 }} /> Обработана</>}
              </span>
              <span className="tele" style={{ fontSize: 10, color: "var(--txt-3)", display: "flex", alignItems: "center", gap: 5 }}>
                <Clock style={{ width: 10, height: 10 }} />
                {fmtDate(l.createdAt)}
              </span>
            </div>

            {/* клиент */}
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{l.name}</div>
            {l.organization && (
              <div style={{ fontSize: 13, color: "var(--cyan)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 style={{ width: 12, height: 12 }} />
                {l.organization}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--txt-2)", marginBottom: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {l.email}
              </span>
              {l.phone && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {l.phone}
                </span>
              )}
            </div>

            {l.message && (
              <p style={{
                fontSize: 13, lineHeight: 1.6, color: "var(--txt-2)", margin: "0 0 14px",
                whiteSpace: "pre-wrap", padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,.03)", border: "1px solid var(--line-soft)",
              }}>
                {l.message}
              </p>
            )}

            {/* кому назначена */}
            <div style={{
              marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line-soft)",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 12, color: "var(--txt-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <UserIcon style={{ width: 12, height: 12, color: "var(--orange)" }} />
                {l.operatorName ? (
                  <>
                    <strong style={{ color: "var(--txt)" }}>{l.operatorName}</strong>
                    {l.managerName && <span style={{ color: "var(--txt-3)" }}>· {l.managerName}</span>}
                  </>
                ) : (
                  <span className="badge badge-grey">ждёт оператора на смене</span>
                )}
              </div>

              {l.hasChat && (
                <span className="badge badge-grey" title="Этот клиент также писал в онлайн-чат">
                  <MessageSquare style={{ width: 10, height: 10 }} /> есть чат
                </span>
              )}
            </div>

            {l.status === "new" && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => markDone(l.id)}>
                <CheckCircle style={{ width: 13, height: 13 }} /> Отметить обработанной
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
