// ══════════════════════════════════════════════════════════════════
// КАБИНЕТ МЕНЕДЖЕРА ОПЕРАТОРОВ
//
// Что здесь есть:
//  • список своих операторов: онлайн/офлайн, а рядом с именем —
//    цифры: сколько диалогов, сообщений и заявок пришло оператору;
//  • выдача доступа новому оператору: имя + почта + пароль
//    (пароль задаёт менеджер — он контролирует доступ);
//  • смена пароля и удаление оператора;
//  • просмотр чатов: нажали на оператора — открылись все его диалоги,
//    их можно читать, но не редактировать (отвечает только оператор).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  Users, UserPlus, Trash2, KeyRound, LogOut, Radar, MessageSquare,
  Inbox, RefreshCw, X, Eye,
} from "lucide-react";
import { api, clearSession, fmtDate, type User } from "./lib";
import { ChatViewer } from "./ChatViewer";
import { LeadsView } from "./LeadsView";

type Operator = {
  id: string; name: string; email: string; createdAt: string;
  stats: { chats: number; messages: number; unread: number; leads: number; newLeads: number; online: boolean };
};

export function ManagerCabinet({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwdFor, setPwdFor] = useState<Operator | null>(null);
  const [newPwd, setNewPwd] = useState("");
  // выбранный оператор — показываем его диалоги для чтения
  const [viewChatsOf, setViewChatsOf] = useState<Operator | null>(null);
  // какой раздел открыт: операторы или заявки с сайта
  const [tab, setTab] = useState<"staff" | "leads">("staff");

  const load = async () => {
    try { setOperators(await api("/api/users/operators")); } catch (e: any) { setError(e.message); }
  };

  // обновляем счётчики каждые 10 секунд
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const createOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/api/users/operators", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "" });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  const removeOperator = async (op: Operator) => {
    if (!confirm(`Удалить оператора «${op.name}»? Доступ будет закрыт немедленно.`)) return;
    try { await api(`/api/users/operators/${op.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setError(e.message); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdFor) return;
    try {
      await api(`/api/users/operators/${pwdFor.id}/password`, {
        method: "PATCH", body: JSON.stringify({ password: newPwd }),
      });
      setPwdFor(null); setNewPwd("");
    } catch (err: any) { setError(err.message); }
  };

  const logout = () => { clearSession(); onLogout(); };

  const totals = operators.reduce(
    (acc, o) => ({
      chats: acc.chats + o.stats.chats,
      messages: acc.messages + o.stats.messages,
      leads: acc.leads + o.stats.leads,
      online: acc.online + (o.stats.online ? 1 : 0),
    }),
    { chats: 0, messages: 0, leads: 0, online: 0 }
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ─── Шапка ─── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)",
        background: "var(--panel)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(65,217,232,.1)", border: "1px solid rgba(65,217,232,.35)",
          }}>
            <Radar style={{ width: 16, height: 16, color: "var(--cyan)" }} />
          </div>
          <div>
            <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>Кабинет менеджера</div>
            <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 2 }}>
              {user.name} · {user.email}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Обновить</span>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Выйти</span>
          </button>
        </div>
      </header>

      {/* ─── Разделы кабинета ─── */}
      {!viewChatsOf && (
        <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderBottom: "1px solid var(--line-soft)" }}>
          <button className={`btn btn-sm ${tab === "staff" ? "" : "btn-ghost"}`} onClick={() => setTab("staff")}>
            <Users style={{ width: 14, height: 14 }} /> Мои операторы
          </button>
          <button className={`btn btn-sm ${tab === "leads" ? "" : "btn-ghost"}`} onClick={() => setTab("leads")}>
            <Inbox style={{ width: 14, height: 14 }} /> Заявки с сайта
          </button>
        </div>
      )}

      {/* ═══ ЗАЯВКИ СВОИХ ОПЕРАТОРОВ ═══ */}
      {!viewChatsOf && tab === "leads" && <LeadsView title="Заявки моих операторов" />}

      {/* ═══ ЭКРАН ЧТЕНИЯ ДИАЛОГОВ ВЫБРАННОГО ОПЕРАТОРА ═══ */}
      {viewChatsOf ? (
        <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
          <ChatViewer
            operatorId={viewChatsOf.id}
            operatorName={viewChatsOf.name}
            onBack={() => setViewChatsOf(null)}
          />
        </div>
      ) : tab === "staff" ? (
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        {/* ─── Сводка ─── */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: 24 }}>
          {[
            { label: "Операторов", value: operators.length, icon: Users },
            { label: "Сейчас на смене", value: totals.online, icon: Users },
            { label: "Диалогов всего", value: totals.chats, icon: MessageSquare },
            { label: "Заявок всего", value: totals.leads, icon: Inbox },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: 18 }}>
              <Icon style={{ width: 16, height: 16, color: "var(--cyan)", marginBottom: 10 }} />
              <div className="display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ─── Заголовок списка ─── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Мои операторы</h2>
          <button className="btn btn-sm" onClick={() => setShowForm(!showForm)}>
            <UserPlus style={{ width: 14, height: 14 }} /> Выдать доступ оператору
          </button>
        </div>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        {/* ─── Форма создания оператора ─── */}
        {showForm && (
          <form onSubmit={createOperator} className="card" style={{ padding: 20, marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 16px", lineHeight: 1.6 }}>
              Укажите имя и почту оператора, а пароль задайте сами — так доступ остаётся под вашим контролем.
              Передайте оператору почту и пароль для входа в кабинет.
            </p>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <div>
                <label className="label">Имя оператора</label>
                <input className="input" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Азиз Каримов" />
              </div>
              <div>
                <label className="label">Электронная почта</label>
                <input className="input" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="aziz@olanhightech.com" />
              </div>
              <div>
                <label className="label">Пароль (задаёте вы)</label>
                <input className="input" required minLength={4} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="минимум 4 символа" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-sm" disabled={busy}>{busy ? "Создание…" : "Создать доступ"}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        )}

        {/* ─── Список операторов со счётчиками ─── */}
        <div style={{ display: "grid", gap: 12 }}>
          {operators.length === 0 && (
            <div className="card" style={{ padding: 24, color: "var(--txt-3)", fontSize: 13, lineHeight: 1.6 }}>
              У вас пока нет операторов. Нажмите «Выдать доступ оператору», чтобы создать первую учётную запись —
              после этого обращения с сайта начнут распределяться между вашими операторами.
              Кнопка «Диалоги» у каждого оператора откроет его переписку для чтения.
            </div>
          )}

          {operators.map((op) => (
            <div key={op.id} className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* имя и статус */}
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                  <span className="dot dot-live" style={{ background: op.stats.online ? "var(--green)" : "var(--txt-3)" }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{op.name}</span>
                  <span className={`badge ${op.stats.online ? "badge-green" : "badge-grey"}`}>
                    {op.stats.online ? "на смене" : "офлайн"}
                  </span>
                </div>
                <div className="tele" style={{ fontSize: 11, color: "var(--txt-3)" }}>
                  {op.email} · с {fmtDate(op.createdAt)}
                </div>
              </div>

              {/* ЦИФРЫ рядом с именем: диалоги, сообщения, заявки */}
              <div style={{ display: "flex", gap: 22 }}>
                {[
                  { label: "Диалоги", value: op.stats.chats, extra: op.stats.unread },
                  { label: "Сообщения", value: op.stats.messages, extra: 0 },
                  { label: "Заявки", value: op.stats.leads, extra: op.stats.newLeads },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, justifyContent: "center" }}>
                      <span className="display" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{s.value}</span>
                      {s.extra > 0 && <span className="badge badge-red" style={{ padding: "1px 6px" }}>+{s.extra}</span>}
                    </div>
                    <div className="tele" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-3)", marginTop: 5 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* действия */}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setViewChatsOf(op)}>
                  <Eye style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Диалоги</span>
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setPwdFor(op); setNewPwd(""); }}>
                  <KeyRound style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Пароль</span>
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => removeOperator(op)}>
                  <Trash2 style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Удалить</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {/* ─── Окно смены пароля ─── */}
      {pwdFor && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(2,8,18,.7)", padding: 20,
          }}
          onClick={() => setPwdFor(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={changePassword}
            className="card"
            style={{ width: "100%", maxWidth: 380, padding: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Новый пароль</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPwdFor(null)} style={{ padding: 6 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 14px" }}>
              Оператор: <strong>{pwdFor.name}</strong>
            </p>
            <input className="input" required minLength={4} value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} placeholder="Новый пароль" />
            <button className="btn" style={{ width: "100%", marginTop: 16 }}>Сохранить пароль</button>
          </form>
        </div>
      )}
    </div>
  );
}
