// ══════════════════════════════════════════════════════════════════
// СТРАНИЦА «МЕНЕДЖЕРЫ И ОПЕРАТОРЫ»
//
// Здесь администратор видит всю структуру: каждого менеджера и
// привязанных к нему операторов со счётчиками обращений.
//
// Что можно делать:
//   • добавить менеджера (логин и пароль задаёт админ)
//   • добавить оператора — любому менеджеру или без менеджера
//   • сменить пароль и удалить любого сотрудника
//   • ПРОЧИТАТЬ ЧАТЫ: нажали на оператора → открылись его диалоги →
//     выбрали диалог → видно всю переписку (только чтение)
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  UserPlus, Trash2, KeyRound, RefreshCw, Users, UserCog, X, ChevronDown, ChevronRight, Eye,
} from "lucide-react";
import { api, fmtDate } from "./lib";
import { ChatViewer } from "./ChatViewer";

type Op = {
  id: string; name: string; email: string; createdAt: string;
  stats: { chats: number; messages: number; unread: number; leads: number; newLeads: number; online: boolean };
};
type Mgr = { id: string; name: string; email: string; createdAt: string; operators: Op[] };

export function PeoplePage() {
  const [managers, setManagers] = useState<Mgr[]>([]);
  const [orphans, setOrphans] = useState<Op[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // формы
  const [mgrForm, setMgrForm] = useState<{ open: boolean; name: string; email: string; password: string }>({
    open: false, name: "", email: "", password: "",
  });
  const [opForm, setOpForm] = useState<{ managerId: string | null; name: string; email: string; password: string }>({
    managerId: null, name: "", email: "", password: "",
  });
  const [pwd, setPwd] = useState<{ kind: "manager" | "operator"; id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");
  // выбранный оператор — читаем его диалоги
  const [viewChatsOf, setViewChatsOf] = useState<Op | null>(null);
  // форма добавления оператора без привязки к конкретной карточке менеджера
  const [freeOpForm, setFreeOpForm] = useState(false);

  const load = async () => {
    try {
      const data = await api("/api/users/tree");
      setManagers(data.managers || []);
      setOrphans(data.withoutManager || []);
      setError("");
    } catch (e: any) { setError(e.message); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 12000); // счётчики обновляются сами
    return () => clearInterval(id);
  }, []);

  // ─── Создание ───
  const createManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/users/managers", {
        method: "POST",
        body: JSON.stringify({ name: mgrForm.name, email: mgrForm.email, password: mgrForm.password }),
      });
      setMgrForm({ open: false, name: "", email: "", password: "" });
      load();
    } catch (err: any) { setError(err.message); }
  };

  const createOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/users/operators", {
        method: "POST",
        body: JSON.stringify({
          name: opForm.name, email: opForm.email, password: opForm.password,
          managerId: opForm.managerId,
        }),
      });
      setOpForm({ managerId: null, name: "", email: "", password: "" });
      load();
    } catch (err: any) { setError(err.message); }
  };

  // ─── Удаление ───
  const removeManager = async (m: Mgr) => {
    const opCount = m.operators.length;
    const msg = opCount
      ? `Удалить менеджера «${m.name}»?\nЕго ${opCount} оператор(ов) автоматически перейдут к другим менеджерам.`
      : `Удалить менеджера «${m.name}»?`;
    if (!confirm(msg)) return;
    try {
      const res = await api(`/api/users/managers/${m.id}`, { method: "DELETE" });
      if (res.message) setError(""); // успех, сообщение покажем ниже при желании
      load();
    } catch (e: any) { setError(e.message); }
  };

  const removeOperator = async (o: Op) => {
    if (!confirm(`Удалить оператора «${o.name}»? Доступ будет закрыт немедленно.`)) return;
    try { await api(`/api/users/operators/${o.id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setError(e.message); }
  };

  // ─── Смена пароля ───
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    const url = pwd.kind === "manager"
      ? `/api/users/managers/${pwd.id}/password`
      : `/api/users/operators/${pwd.id}/password`;
    try {
      await api(url, { method: "PATCH", body: JSON.stringify({ password: newPwd }) });
      setPwd(null); setNewPwd("");
    } catch (err: any) { setError(err.message); }
  };

  const OperatorRow = ({ op }: { op: Op }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      padding: "12px 16px", borderTop: "1px solid var(--line-soft)",
    }}>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="dot dot-live" style={{ background: op.stats.online ? "var(--green)" : "var(--txt-3)" }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{op.name}</span>
        </div>
        <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 3 }}>{op.email}</div>
      </div>

      {/* цифры обращений рядом с именем */}
      <div style={{ display: "flex", gap: 18 }}>
        {[
          { l: "Диалоги", v: op.stats.chats, x: op.stats.unread },
          { l: "Сообщения", v: op.stats.messages, x: 0 },
          { l: "Заявки", v: op.stats.leads, x: op.stats.newLeads },
        ].map((s) => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "center" }}>
              <span className="display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{s.v}</span>
              {s.x > 0 && <span className="badge badge-red" style={{ padding: "0 5px", fontSize: 10 }}>+{s.x}</span>}
            </div>
            <div className="tele" style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-3)", marginTop: 4 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 7 }}>
        <button className="btn btn-sm" onClick={() => setViewChatsOf(op)}>
          <Eye style={{ width: 12, height: 12 }} /> Диалоги
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setPwd({ kind: "operator", id: op.id, name: op.name }); setNewPwd(""); }}>
          <KeyRound style={{ width: 12, height: 12 }} />
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => removeOperator(op)}>
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );

  // ═══ ЭКРАН ЧТЕНИЯ ДИАЛОГОВ ВЫБРАННОГО ОПЕРАТОРА ═══
  if (viewChatsOf) {
    return (
      <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
        <ChatViewer
          operatorId={viewChatsOf.id}
          operatorName={viewChatsOf.name}
          onBack={() => setViewChatsOf(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h2 className="display" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Менеджеры и операторы</h2>
          <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "6px 0 0" }}>
            Вся структура сотрудников. Цифры рядом с именем оператора — сколько ему пришло обращений.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Обновить
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFreeOpForm(!freeOpForm); setOpForm({ managerId: null, name: "", email: "", password: "" }); }}>
            <UserPlus style={{ width: 14, height: 14 }} /> Добавить оператора
          </button>
          <button className="btn btn-sm" onClick={() => setMgrForm({ ...mgrForm, open: !mgrForm.open })}>
            <UserPlus style={{ width: 14, height: 14 }} /> Добавить менеджера
          </button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ─── Форма добавления менеджера ─── */}
      {mgrForm.open && (
        <form onSubmit={createManager} className="card" style={{ padding: 20, marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 14px", lineHeight: 1.6 }}>
            Здесь же задаётся логин и пароль менеджера — с ними он войдёт в свой кабинет и сможет создавать операторов.
          </p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label className="label">Имя менеджера</label>
              <input className="input" required value={mgrForm.name}
                onChange={(e) => setMgrForm({ ...mgrForm, name: e.target.value })} placeholder="Дилшод Рахимов" />
            </div>
            <div>
              <label className="label">Почта (логин)</label>
              <input className="input" type="email" required value={mgrForm.email}
                onChange={(e) => setMgrForm({ ...mgrForm, email: e.target.value })} placeholder="manager@olanhightech.com" />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input className="input" required minLength={4} value={mgrForm.password}
                onChange={(e) => setMgrForm({ ...mgrForm, password: e.target.value })} placeholder="минимум 4 символа" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-sm">Создать менеджера</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMgrForm({ ...mgrForm, open: false })}>Отмена</button>
          </div>
        </form>
      )}

      {/* ─── Форма добавления оператора (админ выбирает менеджера) ─── */}
      {freeOpForm && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            // менеджер обязателен — без него оператор не создаётся
            if (!opForm.managerId) {
              setError("Выберите менеджера, к которому привязать оператора");
              return;
            }
            try {
              await api("/api/users/operators", {
                method: "POST",
                body: JSON.stringify({
                  name: opForm.name,
                  email: opForm.email,
                  password: opForm.password,
                  managerId: opForm.managerId,
                }),
              });
              setOpForm({ managerId: null, name: "", email: "", password: "" });
              setFreeOpForm(false);
              setError("");
              load();
            } catch (err: any) { setError(err.message); }
          }}
          className="card"
          style={{ padding: 20, marginBottom: 18 }}
        >
          <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 14px", lineHeight: 1.6 }}>
            Администратор может создавать операторов наравне с менеджерами.
            Обязательно выберите менеджера, к которому привязать оператора —
            без менеджера оператор не создаётся.
          </p>
          {managers.length === 0 && (
            <div className="error-box" style={{ marginBottom: 14 }}>
              Сначала создайте хотя бы одного менеджера — к нему можно будет привязать оператора.
            </div>
          )}
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <label className="label">Имя оператора</label>
              <input className="input" required value={opForm.name}
                onChange={(e) => setOpForm({ ...opForm, name: e.target.value })} placeholder="Азиз Каримов" />
            </div>
            <div>
              <label className="label">Почта (логин)</label>
              <input className="input" type="email" required value={opForm.email}
                onChange={(e) => setOpForm({ ...opForm, email: e.target.value })} placeholder="aziz@olanhightech.com" />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input className="input" required minLength={4} value={opForm.password}
                onChange={(e) => setOpForm({ ...opForm, password: e.target.value })} placeholder="минимум 4 символа" />
            </div>
            <div>
              <label className="label">Менеджер *</label>
              <select className="input" required value={opForm.managerId || ""}
                onChange={(e) => setOpForm({ ...opForm, managerId: e.target.value || null })}>
                <option value="" disabled>— выберите менеджера —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-sm">Создать оператора</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFreeOpForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      {/* ─── Список менеджеров с операторами ─── */}
      <div style={{ display: "grid", gap: 14 }}>
        {managers.length === 0 && (
          <div className="card" style={{ padding: 24, color: "var(--txt-3)", fontSize: 13, lineHeight: 1.6 }}>
            Менеджеров пока нет. Добавьте первого менеджера — он сможет входить в свой кабинет и создавать операторов.
          </div>
        )}

        {managers.map((m) => {
          const open = expanded[m.id] !== false; // по умолчанию раскрыто
          return (
            <div key={m.id} className="card" style={{ overflow: "hidden" }}>
              {/* строка менеджера */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, flexWrap: "wrap", background: "var(--panel-3)" }}>
                <button
                  onClick={() => setExpanded({ ...expanded, [m.id]: !open })}
                  className="btn btn-ghost btn-sm" style={{ padding: 6 }}
                >
                  {open ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                </button>

                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <UserCog style={{ width: 15, height: 15, color: "var(--cyan)" }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                    <span className="badge badge-grey">менеджер</span>
                  </div>
                  <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 4 }}>
                    {m.email} · с {fmtDate(m.createdAt)}
                  </div>
                </div>

                <div style={{ textAlign: "center", marginRight: 6 }}>
                  <div className="display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{m.operators.length}</div>
                  <div className="tele" style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--txt-3)", marginTop: 4 }}>
                    Операторов
                  </div>
                </div>

                <div style={{ display: "flex", gap: 7 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpForm({ managerId: m.id, name: "", email: "", password: "" })}>
                    <UserPlus style={{ width: 12, height: 12 }} /> Оператор
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPwd({ kind: "manager", id: m.id, name: m.name }); setNewPwd(""); }}>
                    <KeyRound style={{ width: 12, height: 12 }} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeManager(m)}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>

              {/* форма добавления оператора этому менеджеру */}
              {opForm.managerId === m.id && (
                <form onSubmit={createOperator} style={{ padding: 18, borderTop: "1px solid var(--line)", background: "rgba(65,217,232,.03)" }}>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <div>
                      <label className="label">Имя оператора</label>
                      <input className="input" required value={opForm.name}
                        onChange={(e) => setOpForm({ ...opForm, name: e.target.value })} placeholder="Азиз Каримов" />
                    </div>
                    <div>
                      <label className="label">Почта (логин)</label>
                      <input className="input" type="email" required value={opForm.email}
                        onChange={(e) => setOpForm({ ...opForm, email: e.target.value })} placeholder="aziz@olanhightech.com" />
                    </div>
                    <div>
                      <label className="label">Пароль</label>
                      <input className="input" required minLength={4} value={opForm.password}
                        onChange={(e) => setOpForm({ ...opForm, password: e.target.value })} placeholder="минимум 4 символа" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="btn btn-sm">Создать оператора</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpForm({ ...opForm, managerId: null })}>Отмена</button>
                  </div>
                </form>
              )}

              {/* операторы менеджера */}
              {open && (
                m.operators.length === 0 ? (
                  <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--txt-3)", borderTop: "1px solid var(--line-soft)" }}>
                    У этого менеджера пока нет операторов
                  </div>
                ) : (
                  m.operators.map((op) => <OperatorRow key={op.id} op={op} />)
                )
              )}
            </div>
          );
        })}

        {/* операторы без менеджера */}
        {orphans.length > 0 && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: 16, background: "var(--panel-3)", display: "flex", alignItems: "center", gap: 10 }}>
              <Users style={{ width: 15, height: 15, color: "var(--orange)" }} />
              <span style={{ fontWeight: 600 }}>Операторы без менеджера</span>
              <span className="badge badge-orange">{orphans.length}</span>
            </div>
            {orphans.map((op) => <OperatorRow key={op.id} op={op} />)}
          </div>
        )}
      </div>

      {/* ─── Окно смены пароля ─── */}
      {pwd && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(2,8,18,.7)", padding: 20 }}
          onClick={() => setPwd(null)}
        >
          <form onClick={(e) => e.stopPropagation()} onSubmit={savePassword} className="card" style={{ width: "100%", maxWidth: 380, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Новый пароль</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPwd(null)} style={{ padding: 6 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 14px" }}>
              {pwd.kind === "manager" ? "Менеджер" : "Оператор"}: <strong>{pwd.name}</strong>
            </p>
            <input className="input" required minLength={4} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Новый пароль" />
            <button className="btn" style={{ width: "100%", marginTop: 16 }}>Сохранить пароль</button>
          </form>
        </div>
      )}
    </div>
  );
}
