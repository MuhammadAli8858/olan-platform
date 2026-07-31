// ══════════════════════════════════════════════════════════════════
// UI: ФОРМА ЗАЯВКИ
// Имя · организация · почта · телефон · сообщение.
// После отправки показывает экран «Заявка получена».
// Сюда позже подключается реальный бэкенд (onSubmit).
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { PrimaryButton } from "./Buttons";
import { API_URL } from "../../config";
import { useLang } from "../../i18n/LangContext";

/**
 * Номер сессии посетителя — тот же, что использует онлайн-чат.
 * Передаём его вместе с заявкой, чтобы сервер узнал клиента
 * и отдал заявку тому оператору, с которым тот уже переписывался.
 */
function getChatSessionId() {
  try {
    return localStorage.getItem("oht-chat-session") || "";
  } catch {
    return "";
  }
}

// ─── ФОРМА СВЯЗИ ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--line)",
  color: "var(--txt)",
  borderRadius: "var(--r-md)",
  // длинный текст без пробелов переносится внутри рамки поля,
  // а само поле никогда не шире своей колонки
  minWidth: 0,
  width: "100%",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

export function ContactForm({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useLang();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", organization: "", email: "", phone: "", message: "" });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Отправка заявки: уходит на сервер и попадает в кабинет оператора
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lang,
          page: window.location.pathname,
          sessionId: getChatSessionId(), // связь с диалогом в чате
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError(t.contact.err);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--cyan-dim)", border: "1px solid var(--cyan-border)" }}>
          <CheckCircle className="w-7 h-7" style={{ color: "var(--cyan)" }} />
        </div>
        <p className="font-display font-bold text-xl uppercase tracking-wide" style={{ color: "var(--txt)" }}>
          {t.contact.sentTitle}
        </p>
        <p className="text-sm max-w-md" style={{ color: "var(--txt-2)", overflowWrap: "anywhere" }}>
          {t.contact.sentText}
        </p>
      </div>
    );
  }

  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "var(--cyan)"; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "var(--line)"; },
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <input required value={form.name} onChange={set("name")} placeholder={t.contact.name} className="px-4 py-3 text-sm outline-none transition-colors duration-150" style={inputStyle} {...focusHandlers} />
        <input value={form.organization} onChange={set("organization")} placeholder={t.contact.org} className="px-4 py-3 text-sm outline-none transition-colors duration-150" style={inputStyle} {...focusHandlers} />
      </div>
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <input required type="email" value={form.email} onChange={set("email")} placeholder={t.contact.email} className="px-4 py-3 text-sm outline-none transition-colors duration-150" style={inputStyle} {...focusHandlers} />
        <input value={form.phone} onChange={set("phone")} placeholder={t.contact.phone} className="px-4 py-3 text-sm outline-none transition-colors duration-150" style={inputStyle} {...focusHandlers} />
      </div>
      <textarea required rows={4} value={form.message} onChange={set("message")} placeholder={t.contact.message} className="px-4 py-3 text-sm outline-none transition-colors duration-150" style={inputStyle} {...focusHandlers} />
      {error && (
        <div className="text-sm px-4 py-3" style={{ borderRadius: "var(--r-md)", background: "var(--red-dim)", border: "1px solid var(--red-border)", color: "var(--red)" }}>
          {error}
        </div>
      )}
      <div className="self-start w-full sm:w-auto">
        <PrimaryButton>
          {sending ? "…" : t.contact.submit} <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </form>
  );
}
