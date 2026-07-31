// ══════════════════════════════════════════════════════════════════
// КАБИНЕТ ОПЕРАТОРА
//
// Что здесь есть:
//  • слева — список диалогов, назначенных именно этому оператору
//    (счётчик непрочитанных у каждого);
//  • справа — переписка и поле ответа; ответ мгновенно появляется
//    в чате на главном сайте;
//  • вкладка «Заявки» — обращения с формы «Запросить консультацию»,
//    распределённые этому оператору;
//  • уведомления браузера при новом сообщении или заявке.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  MessageSquare, Send, Bell, BellOff, LogOut, Inbox, User as UserIcon,
  CheckCircle, Circle, Globe, Radar, Mail, Phone, Building2,
} from "lucide-react";
import {
  API_URL, api, loadSession, clearSession, showNotification,
  notifyPermission, askNotifyPermission, fmtTime, fmtDate, type User,
} from "./lib";
import { LeadCard, type Lead } from "./LeadCard";

type Visitor = { name?: string; email?: string; organization?: string; phone?: string };
type ChatItem = { id: string; visitorName: string; visitor?: Visitor; lang: string; unread: number; lastAt: string; lastMessage: string };
type Msg = { id: string; from: string; text: string; at: string };
// Тип заявки и её карточка — общие для всех кабинетов (см. LeadCard.tsx)

export function OperatorCabinet({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<"chats" | "leads">("chats");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connected, setConnected] = useState(false);
  const [notify, setNotify] = useState(notifyPermission());

  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  activeRef.current = activeId;

  // ─── Подключение к серверу ───
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("operator:auth", { token: session.token });
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("operator:ready", ({ chats: list }) => setChats(list || []));

    socket.on("chat:list-changed", () => refreshChats());

    socket.on("operator:chat-opened", (chat: any) => {
      setMessages(chat.messages || []);
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)));
    });

    // новое сообщение от посетителя
    socket.on("operator:incoming", ({ chatId, visitorName, message }) => {
      if (chatId === activeRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
      refreshChats();
      showNotification(`Новое сообщение — ${visitorName}`, message.text, () => {
        setTab("chats");
        openChat(chatId);
      });
    });

    // свой отправленный ответ (пришёл из другой вкладки)
    socket.on("operator:message-sent", ({ chatId, message }) => {
      if (chatId === activeRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
      refreshChats();
    });

    // при выходе на смену сервер раздаёт накопившиеся обращения —
    // обновляем список заявок
    socket.on("leads:changed", () => refreshLeads());

    // новая заявка с формы сайта
    socket.on("lead:new", (lead: Lead) => {
      setLeads((prev) => [lead, ...prev]);
      showNotification("Новая заявка с сайта", `${lead.name} — ${lead.organization || lead.email}`, () => setTab("leads"));
    });

    return () => { socket.disconnect(); };
  }, []);

  // ─── Загрузка списков ───
  const refreshChats = async () => {
    try { setChats(await api("/api/chats")); } catch { /* сервер недоступен */ }
  };
  const refreshLeads = async () => {
    try { setLeads(await api("/api/leads")); } catch { /* сервер недоступен */ }
  };

  useEffect(() => { refreshChats(); refreshLeads(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const openChat = (id: string) => {
    setActiveId(id);
    setMessages([]);
    socketRef.current?.emit("operator:open-chat", { chatId: id });
  };

  const send = () => {
    const value = text.trim();
    if (!value || !activeId) return;
    socketRef.current?.emit("operator:message", { chatId: activeId, text: value });
    setText("");
  };

  const markLead = async (id: string) => {
    try {
      await api(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "done" } : l)));
    } catch { /* ок */ }
  };

  const logout = () => { clearSession(); onLogout(); };

  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const newLeads = leads.filter((l) => l.status === "new").length;
  const activeChat = chats.find((c) => c.id === activeId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ─── Шапка ─── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)",
        background: "var(--panel)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,122,26,.14)", border: "1px solid rgba(255,122,26,.4)",
          }}>
            <Radar style={{ width: 16, height: 16, color: "var(--orange)" }} />
          </div>
          <div>
            <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>Кабинет оператора</div>
            <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 2 }}>
              {user.name} · {user.email}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`badge ${connected ? "badge-green" : "badge-grey"}`}>
            <span className="dot dot-live" style={{ background: connected ? "var(--green)" : "var(--txt-3)" }} />
            {connected ? "На смене" : "Нет связи"}
          </span>

          {notify !== "granted" && (
            <button className="btn btn-ghost btn-sm" onClick={async () => setNotify(await askNotifyPermission() as any)}>
              <BellOff style={{ width: 13, height: 13 }} />
              <span className="hide-mobile">Включить уведомления</span>
            </button>
          )}
          {notify === "granted" && (
            <span className="badge badge-grey hide-mobile"><Bell style={{ width: 12, height: 12 }} /> Уведомления вкл.</span>
          )}

          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut style={{ width: 13, height: 13 }} /> <span className="hide-mobile">Выйти</span>
          </button>
        </div>
      </header>

      {/* ─── Вкладки ─── */}
      <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderBottom: "1px solid var(--line-soft)" }}>
        <button
          className={`btn btn-sm ${tab === "chats" ? "" : "btn-ghost"}`}
          onClick={() => setTab("chats")}
        >
          <MessageSquare style={{ width: 14, height: 14 }} /> Диалоги
          {totalUnread > 0 && <span className="badge badge-red" style={{ padding: "1px 7px" }}>{totalUnread}</span>}
        </button>
        <button
          className={`btn btn-sm ${tab === "leads" ? "" : "btn-ghost"}`}
          onClick={() => setTab("leads")}
        >
          <Inbox style={{ width: 14, height: 14 }} /> Заявки
          {newLeads > 0 && <span className="badge badge-red" style={{ padding: "1px 7px" }}>{newLeads}</span>}
        </button>
      </div>

      {/* ─── Диалоги ─── */}
      {tab === "chats" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* список диалогов */}
          <aside style={{
            width: 300, flexShrink: 0, borderRight: "1px solid var(--line)",
            overflowY: "auto", background: "var(--panel)",
          }} className={activeId ? "hide-mobile" : ""}>
            {chats.length === 0 && (
              <div style={{ padding: 24, color: "var(--txt-3)", fontSize: 13, lineHeight: 1.6 }}>
                Пока нет диалогов. Как только посетитель напишет в чат на сайте,
                обращение появится здесь.
              </div>
            )}
            {chats.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "14px 16px",
                  background: c.id === activeId ? "var(--panel-3)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--line-soft)",
                  borderLeft: c.id === activeId ? "2px solid var(--orange)" : "2px solid transparent",
                  color: "var(--txt)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13 }}>
                    <UserIcon style={{ width: 13, height: 13, color: "var(--cyan)" }} />
                    {c.visitorName}
                  </span>
                  {c.unread > 0 && <span className="badge badge-red" style={{ padding: "1px 7px" }}>{c.unread}</span>}
                </div>
                {c.visitor?.organization && (
                  <div style={{ fontSize: 11, color: "var(--cyan)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.visitor.organization}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastMessage || "—"}
                </div>
                <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 5, display: "flex", gap: 8 }}>
                  <span>{fmtDate(c.lastAt)}</span>
                  {c.lang && <span><Globe style={{ width: 9, height: 9, display: "inline" }} /> {c.lang.toUpperCase()}</span>}
                </div>
              </button>
            ))}
          </aside>

          {/* переписка */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {!activeId ? (
              <div style={{ margin: "auto", color: "var(--txt-3)", fontSize: 14, textAlign: "center", padding: 24 }}>
                Выберите диалог слева, чтобы ответить посетителю
              </div>
            ) : (
              <>
                {/* ─── Анкета посетителя: всё, что он указал перед началом чата ─── */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, minWidth: 0, overflowWrap: "anywhere" }}>
                      {activeChat?.visitor?.name || activeChat?.visitorName || "Посетитель"}
                    </span>
                    <span className="tele" style={{ fontSize: 10, color: "var(--txt-3)" }}>
                      ДИАЛОГ {activeId.slice(0, 6).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--txt-2)" }}>
                    {activeChat?.visitor?.organization && (
                      <span className="inline-field">
                        <Building2 style={{ width: 12, height: 12, color: "var(--cyan)" }} />
                        {activeChat.visitor.organization}
                      </span>
                    )}
                    {activeChat?.visitor?.email && (
                      <a href={`mailto:${activeChat.visitor.email}`} className="inline-field" style={{ color: "var(--txt-2)" }}>
                        <Mail style={{ width: 12, height: 12, color: "var(--cyan)" }} />
                        {activeChat.visitor.email}
                      </a>
                    )}
                    {activeChat?.visitor?.phone && (
                      <a href={`tel:${activeChat.visitor.phone}`} className="inline-field" style={{ color: "var(--txt-2)" }}>
                        <Phone style={{ width: 12, height: 12, color: "var(--cyan)" }} />
                        {activeChat.visitor.phone}
                      </a>
                    )}
                    {activeChat?.lang && (
                      <span className="inline-field">
                        <Globe style={{ width: 12, height: 12, color: "var(--cyan)" }} />
                        {activeChat.lang.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.map((m) => {
                    const mine = m.from === "operator";
                    return (
                      <div key={m.id} style={{
                        alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "72%",
                        padding: "10px 14px", borderRadius: 14,
                        background: mine ? "var(--orange)" : "var(--panel-2)",
                        border: mine ? "none" : "1px solid var(--line)",
                        color: mine ? "#160a00" : "var(--txt)",
                        fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere",
                      }}>
                        {m.text}
                        <div style={{ fontSize: 10, opacity: .6, marginTop: 4 }}>{fmtTime(m.at)}</div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div style={{ display: "flex", gap: 10, padding: 14, borderTop: "1px solid var(--line)" }}>
                  <input
                    className="input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Введите ответ посетителю…"
                  />
                  <button className="btn" onClick={send} disabled={!text.trim()}>
                    <Send style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ─── Заявки с формы сайта ─── */}
      {tab === "leads" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {leads.length === 0 && (
            <div style={{ color: "var(--txt-3)", fontSize: 13 }}>
              Заявок пока нет. Обращения с формы «Запросить бесплатную консультацию»
              на сайте будут приходить сюда.
            </div>
          )}
          <div className="lead-grid">
            {leads.map((l) => (
              <LeadCard key={l.id} lead={l} onMarkDone={markLead} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
