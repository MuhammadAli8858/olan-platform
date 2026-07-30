// ══════════════════════════════════════════════════════════════════
// ВИДЖЕТ ОНЛАЙН-ЧАТА
//
// Как работает:
//  • Через несколько секунд после захода на сайт окно чата
//    открывается само. Посетитель может его закрыть — тогда в этот
//    визит оно больше не появится, но при следующем заходе на сайт
//    откроется снова.
//  • При первом обращении посетитель заполняет анкету:
//    имя, почта, организация, телефон — все поля обязательны.
//    Только после этого начинается переписка с оператором.
//  • Анкета запоминается: при повторном заходе заполнять её снова
//    не нужно, диалог продолжится с того же места.
//  • Посетитель видит имя оператора, который ему отвечает.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { MessageCircle, X, Send, Bell, ArrowRight } from "lucide-react";
import { API_URL } from "../../config";
import { useLang } from "../../i18n/LangContext";

type Msg = { id: string; from: "client" | "operator" | "system"; text: string; authorName?: string; at: string };
type Visitor = { name: string; email: string; organization: string; phone: string };

/** Через сколько миллисекунд после захода открыть чат самому */
const AUTO_OPEN_DELAY = 7000;

/** Номер сессии посетителя — свой у каждого браузера */
function getSessionId() {
  try {
    let id = localStorage.getItem("oht-chat-session");
    if (!id) {
      id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("oht-chat-session", id);
    }
    return id;
  } catch {
    return "s_" + Math.random().toString(36).slice(2);
  }
}

export function ChatWidget() {
  const { t, lang, rtl } = useLang();

  const [open, setOpen] = useState(false);
  const [closedByUser, setClosedByUser] = useState(false); // закрыл вручную в этот визит
  const [needsForm, setNeedsForm] = useState(false);       // нужно заполнить анкету
  const [form, setForm] = useState<Visitor>({ name: "", email: "", organization: "", phone: "" });
  const [formError, setFormError] = useState("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [operatorOnline, setOperatorOnline] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [unread, setUnread] = useState(0);
  const [notifyState, setNotifyState] = useState<NotificationPermission>("default");

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const closedRef = useRef(closedByUser);
  openRef.current = open;
  closedRef.current = closedByUser;

  // ─── Подключение к серверу чата ───
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("client:hello", { sessionId: getSessionId() });
    });
    socket.on("disconnect", () => setConnected(false));

    // сервер просит заполнить анкету — посетитель здесь впервые
    socket.on("chat:need-registration", () => setNeedsForm(true));

    socket.on("chat:state", ({ messages: history, operatorOnline: online, operatorName: opName, visitor }) => {
      setMessages(history || []);
      setOperatorOnline(Boolean(online));
      setOperatorName(opName || "");
      setNeedsForm(false);
      if (visitor?.name) setForm((f) => ({ ...f, ...visitor }));
    });

    socket.on("chat:message", (msg: Msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.from === "operator") {
        if (msg.authorName) setOperatorName(msg.authorName);
        if (!openRef.current) setUnread((n) => n + 1);
        showBrowserNotification(msg.authorName || t.chat.operator, msg.text);
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  // ─── Автооткрытие через несколько секунд после захода на сайт ───
  useEffect(() => {
    const timer = setTimeout(() => {
      // не открываем, если посетитель уже закрыл окно вручную в этот визит
      if (!closedRef.current) {
        setOpen(true);
        setUnread(0);
      }
    }, AUTO_OPEN_DELAY);
    return () => clearTimeout(timer);
    // срабатывает один раз за загрузку страницы —
    // поэтому при следующем заходе на сайт чат откроется снова
  }, []);

  // ─── Уведомления браузера ───
  useEffect(() => {
    if ("Notification" in window) setNotifyState(Notification.permission);
  }, []);

  const askNotifyPermission = async () => {
    if (!("Notification" in window)) return;
    setNotifyState(await Notification.requestPermission());
  };

  const showBrowserNotification = (who: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible" && openRef.current) return;
    try {
      const n = new Notification(`OLAN HIGH TECH — ${who}`, {
        body: body.slice(0, 140),
        icon: "/favicon.ico",
        tag: "oht-chat",
      });
      n.onclick = () => { window.focus(); setOpen(true); n.close(); };
    } catch { /* браузер может блокировать */ }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, needsForm]);

  // ─── Отправка анкеты ───
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, organization, phone } = form;
    if (!name.trim() || !email.trim() || !organization.trim() || !phone.trim()) {
      setFormError(t.chat.formRequired);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFormError(t.chat.formEmailError);
      return;
    }
    setFormError("");
    socketRef.current?.emit("client:register", {
      sessionId: getSessionId(),
      ...form,
      lang,
      page: window.location.pathname,
    });
  };

  const send = () => {
    const value = text.trim();
    if (!value || !socketRef.current) return;
    socketRef.current.emit("client:message", { text: value });
    setText("");
  };

  const openChat = () => {
    setOpen(true);
    setUnread(0);
    if (notifyState === "default") askNotifyPermission();
  };

  const closeChat = () => {
    setOpen(false);
    setClosedByUser(true); // в этот визит больше не открывать самому
  };

  const side = rtl ? { left: 20 } : { right: 20 };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 12,
    background: "var(--input-bg)", border: "1px solid var(--line)",
    color: "var(--txt)", fontSize: 13, outline: "none",
  };

  return (
    <>
      {/* ─── Круглая кнопка вызова чата ─── */}
      {!open && (
        <button
          onClick={openChat}
          aria-label={t.chat.title}
          className="oht-chat-button"
          style={{
            position: "fixed", bottom: 20, ...side, zIndex: 60,
            width: 58, height: 58, borderRadius: "50%",
            background: "var(--orange)", color: "#160A00",
            border: "none", cursor: "pointer",
            boxShadow: "0 10px 30px rgba(255,122,26,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MessageCircle style={{ width: 24, height: 24 }} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2, minWidth: 22, height: 22,
              borderRadius: 11, background: "var(--red)", color: "#fff",
              fontSize: 12, fontWeight: 700, display: "flex",
              alignItems: "center", justifyContent: "center", padding: "0 6px",
            }}>{unread}</span>
          )}
        </button>
      )}

      {/* ─── Окно чата ─── */}
      {open && (
        <div
          className="oht-chat-window"
          style={{
            position: "fixed", bottom: 20, ...side, zIndex: 60,
            width: "min(370px, calc(100vw - 32px))",
            height: "min(580px, calc(100vh - 100px))",
            display: "flex", flexDirection: "column",
            background: "var(--panel-2)", border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)", overflow: "hidden",
            boxShadow: "0 24px 60px rgba(2,8,18,0.45)",
            textAlign: rtl ? "right" : "left",
          }}
        >
          {/* шапка: показывает имя оператора, когда он назначен */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, padding: "14px 16px", background: "var(--orange)", color: "#160A00",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {operatorName && !needsForm ? operatorName : t.chat.title}
              </div>
              <div style={{ fontSize: 11, opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: operatorOnline ? "#0a7a3f" : "#8a5a20" }} />
                {!connected ? t.chat.connecting : operatorOnline ? t.chat.online : t.chat.offline}
              </div>
            </div>
            <button onClick={closeChat} aria-label="Закрыть"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#160A00", padding: 4 }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {needsForm ? (
            /* ─── АНКЕТА перед началом переписки ─── */
            <form onSubmit={submitForm} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--txt-2)", margin: "0 0 4px" }}>
                {t.chat.formIntro}
              </p>

              <input style={inputStyle} placeholder={`${t.chat.formName} *`} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input style={inputStyle} type="email" placeholder={`${t.chat.formEmail} *`} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input style={inputStyle} placeholder={`${t.chat.formOrg} *`} value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              <input style={inputStyle} placeholder={`${t.chat.formPhone} *`} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              {formError && (
                <div style={{
                  padding: "9px 12px", borderRadius: 10, fontSize: 12,
                  background: "var(--red-dim)", border: "1px solid var(--red-border)", color: "var(--red)",
                }}>{formError}</div>
              )}

              <button type="submit" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 18px", borderRadius: 999, border: "none",
                background: "var(--orange)", color: "#160A00", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {t.chat.formSubmit} <ArrowRight style={{ width: 15, height: 15 }} />
              </button>

              <p style={{ fontSize: 11, color: "var(--txt-3)", lineHeight: 1.5, margin: 0 }}>
                {t.chat.formNote}
              </p>
            </form>
          ) : (
            <>
              {/* ─── Лента сообщений ─── */}
              <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  alignSelf: "flex-start", maxWidth: "85%", padding: "10px 13px", borderRadius: 14,
                  background: "var(--chip-bg)", border: "1px solid var(--line)",
                  fontSize: 13, lineHeight: 1.5, color: "var(--txt-2)",
                }}>
                  {t.chat.greeting}
                </div>

                {messages.map((m) => {
                  const mine = m.from === "client";
                  return (
                    <div key={m.id} style={{
                      alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%",
                      padding: "10px 13px", borderRadius: 14,
                      background: mine ? "var(--orange)" : "var(--chip-bg)",
                      border: mine ? "none" : "1px solid var(--line)",
                      color: mine ? "#160A00" : "var(--txt)",
                      fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {!mine && (
                        <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 3, fontWeight: 600, color: "var(--cyan)" }}>
                          {m.authorName || operatorName || t.chat.operator}
                        </div>
                      )}
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4 }}>
                        {new Date(m.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {notifyState === "default" && (
                <button onClick={askNotifyPermission} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 14px", background: "var(--cyan-dim)", border: "none",
                  borderTop: "1px solid var(--line)", color: "var(--cyan)",
                  fontSize: 12, cursor: "pointer", textAlign: "inherit",
                }}>
                  <Bell style={{ width: 14, height: 14, flexShrink: 0 }} />
                  {t.chat.enableNotify}
                </button>
              )}

              <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--line)" }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder={t.chat.placeholder}
                  style={{ ...inputStyle, borderRadius: 999 }}
                />
                <button onClick={send} aria-label={t.chat.send} style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: "var(--orange)", color: "#160A00", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Send style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
