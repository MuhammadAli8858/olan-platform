// ══════════════════════════════════════════════════════════════════
// ПРОСМОТР ЧАТОВ ОПЕРАТОРА — ТОЛЬКО ДЛЯ ЧТЕНИЯ
//
// Используется в кабинете менеджера и в админ-панели.
// Порядок такой: выбрали оператора → открылся список его диалогов →
// выбрали диалог → видно всю переписку.
//
// Отвечать в чужих диалогах нельзя — поля ввода здесь нет.
// Отвечает только сам оператор в своём кабинете.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  ArrowLeft, MessageSquare, Eye, User as UserIcon,
  Mail, Phone, Building2, Globe, Lock,
} from "lucide-react";
import { api, fmtDate, fmtTime } from "./lib";

type Visitor = { name?: string; email?: string; organization?: string; phone?: string };
type ChatItem = {
  id: string; visitorName: string; visitor?: Visitor;
  lang: string; unread: number; lastAt: string; lastMessage: string;
};
type Msg = { id: string; from: string; text: string; authorName?: string; at: string };

export function ChatViewer({
  operatorId,
  operatorName,
  onBack,
}: {
  operatorId: string;
  operatorName: string;
  onBack: () => void;
}) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─── Список диалогов выбранного оператора ───
  useEffect(() => {
    setLoading(true);
    api(`/api/chats/by-operator/${operatorId}`)
      .then(setChats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [operatorId]);

  // ─── Открыть переписку ───
  const openChat = async (id: string) => {
    try {
      const chat = await api(`/api/chats/${id}`);
      setActive(chat);
      setMessages(chat.messages || []);
    } catch (e: any) { setError(e.message); }
  };

  // ═══ ЭКРАН ПЕРЕПИСКИ ═══
  if (active) {
    const v: Visitor = active.visitor || {};
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)} style={{ marginBottom: 16 }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> К списку диалогов
        </button>

        {/* анкета посетителя */}
        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600, fontSize: 15 }}>
              <UserIcon style={{ width: 15, height: 15, color: "var(--cyan)" }} />
              {v.name || active.visitorName}
            </span>
            <span className="badge badge-grey">
              <Lock style={{ width: 10, height: 10 }} /> только чтение
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--txt-2)" }}>
            {v.organization && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {v.organization}
              </span>
            )}
            {v.email && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {v.email}
              </span>
            )}
            {v.phone && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Phone style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {v.phone}
              </span>
            )}
            {active.lang && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Globe style={{ width: 12, height: 12, color: "var(--cyan)" }} /> {String(active.lang).toUpperCase()}
              </span>
            )}
          </div>

          <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 10 }}>
            Оператор: {active.operatorName || operatorName} · начат {fmtDate(active.createdAt)}
          </div>
        </div>

        {/* переписка */}
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, maxHeight: "60vh", overflowY: "auto" }}>
          {messages.length === 0 && (
            <div style={{ color: "var(--txt-3)", fontSize: 13 }}>В этом диалоге пока нет сообщений</div>
          )}
          {messages.map((m) => {
            const fromOperator = m.from === "operator";
            return (
              <div key={m.id} style={{
                alignSelf: fromOperator ? "flex-end" : "flex-start", maxWidth: "72%",
                padding: "10px 14px", borderRadius: 14,
                background: fromOperator ? "rgba(255,122,26,.14)" : "var(--panel-3)",
                border: `1px solid ${fromOperator ? "rgba(255,122,26,.3)" : "var(--line)"}`,
                fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                <div style={{ fontSize: 10, marginBottom: 4, fontWeight: 600, color: fromOperator ? "var(--orange)" : "var(--cyan)" }}>
                  {fromOperator ? (m.authorName || operatorName) : (v.name || "Посетитель")}
                </div>
                {m.text}
                <div style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 5 }}>{fmtTime(m.at)}</div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: "var(--txt-3)", marginTop: 14, display: "flex", alignItems: "center", gap: 7 }}>
          <Lock style={{ width: 12, height: 12 }} />
          Переписку можно только читать. Отвечать посетителю может лишь сам оператор в своём кабинете.
        </p>
      </div>
    );
  }

  // ═══ СПИСОК ДИАЛОГОВ ОПЕРАТОРА ═══
  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft style={{ width: 13, height: 13 }} /> Назад
      </button>

      <h3 className="display" style={{ fontSize: 20, margin: "0 0 4px" }}>
        Диалоги оператора: {operatorName}
      </h3>
      <p style={{ fontSize: 13, color: "var(--txt-2)", margin: "0 0 18px" }}>
        Выберите диалог, чтобы прочитать переписку. Изменять её нельзя.
      </p>

      {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: "var(--txt-3)", fontSize: 13 }}>Загрузка…</div>}

      {!loading && chats.length === 0 && (
        <div className="card" style={{ padding: 24, color: "var(--txt-3)", fontSize: 13, lineHeight: 1.6 }}>
          У этого оператора пока нет диалогов.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => openChat(c.id)}
            className="card"
            style={{
              padding: 16, textAlign: "left", display: "flex", alignItems: "center",
              gap: 14, flexWrap: "wrap", cursor: "pointer", width: "100%",
            }}
          >
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <MessageSquare style={{ width: 13, height: 13, color: "var(--cyan)" }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{c.visitor?.name || c.visitorName}</span>
                {c.unread > 0 && <span className="badge badge-red" style={{ padding: "1px 7px" }}>{c.unread}</span>}
              </div>
              {c.visitor?.organization && (
                <div style={{ fontSize: 12, color: "var(--cyan)", marginBottom: 3 }}>{c.visitor.organization}</div>
              )}
              <div style={{ fontSize: 12, color: "var(--txt-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.lastMessage || "—"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="tele" style={{ fontSize: 10, color: "var(--txt-3)" }}>{fmtDate(c.lastAt)}</span>
              <span className="badge badge-grey"><Eye style={{ width: 11, height: 11 }} /> читать</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
