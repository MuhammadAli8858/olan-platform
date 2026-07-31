// ══════════════════════════════════════════════════════════════════
// КОРЕНЬ АДМИН-ПАНЕЛИ
//
// Две страницы:
//   • «Редактор сайта»          — всё содержимое главного сайта
//   • «Менеджеры и операторы»   — структура сотрудников, доступы
//
// Вход администратора задаётся в коде сервера: server/src/config.js
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Radar, LogIn, LogOut, FileEdit, Users, Inbox } from "lucide-react";
import { API_URL, saveSession, clearSession, loadSession, type User } from "./lib";
import { ContentEditor } from "./ContentEditor";
import { PeoplePage } from "./PeoplePage";
import { LeadsView } from "./LeadsView";

function AdminLogin({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось войти");
      if (json.user.role !== "admin") throw new Error("Эта панель только для администратора");
      saveSession(json.token, json.user);
      onLogin(json.user);
    } catch (err: any) {
      // «Failed to fetch» ничего не объясняет — показываем, куда шёл запрос
      const noConnection =
        err instanceof TypeError || /fetch|network|получить данные/i.test(err.message || "");
      setError(
        noConnection
          ? `Нет связи с сервером ${API_URL}. Проверьте: 1) сервер запущен — откройте ${API_URL}/api/health; 2) адрес сайта добавлен в ALLOWED_ORIGINS на сервере; 3) после изменения VITE_API_URL сделан новый деплой сайта.`
          : err.message || "Сервер недоступен"
      );
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,122,26,.14)", border: "1px solid rgba(255,122,26,.4)",
          }}>
            <Radar style={{ width: 18, height: 18, color: "var(--orange)" }} />
          </div>
          <div>
            <div className="display" style={{ fontWeight: 700, fontSize: 15 }}>OLAN HIGH TECH</div>
            <div className="tele" style={{ fontSize: 9, letterSpacing: ".2em", color: "var(--orange)", marginTop: 2 }}>
              АДМИН-ПАНЕЛЬ
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Логин администратора</label>
          <input className="input" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@olanhightech.com" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="label">Пароль</label>
          <input className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          <LogIn style={{ width: 15, height: 15 }} /> {busy ? "Вход…" : "Войти"}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: "var(--txt-3)", lineHeight: 1.6 }}>
          Логин и пароль администратора задаются в коде сервера — файл <code>server/src/config.js</code>.
        </p>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadSession()?.user || null);
  const [page, setPage] = useState<"content" | "people" | "leads">("content");

  if (!user) return <AdminLogin onLogin={setUser} />;

  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--line)",
        background: "var(--panel)", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,122,26,.14)", border: "1px solid rgba(255,122,26,.4)",
          }}>
            <Radar style={{ width: 16, height: 16, color: "var(--orange)" }} />
          </div>
          <div>
            <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>Админ-панель</div>
            <div className="tele" style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 2 }}>{user.email}</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 8 }}>
          <button className={`btn btn-sm ${page === "content" ? "" : "btn-ghost"}`} onClick={() => setPage("content")}>
            <FileEdit style={{ width: 14, height: 14 }} /> Редактор сайта
          </button>
          <button className={`btn btn-sm ${page === "people" ? "" : "btn-ghost"}`} onClick={() => setPage("people")}>
            <Users style={{ width: 14, height: 14 }} /> Менеджеры и операторы
          </button>
          <button className={`btn btn-sm ${page === "leads" ? "" : "btn-ghost"}`} onClick={() => setPage("leads")}>
            <Inbox style={{ width: 14, height: 14 }} /> Заявки
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { clearSession(); setUser(null); }}>
            <LogOut style={{ width: 13, height: 13 }} />
          </button>
        </nav>
      </header>

      {page === "content" && <ContentEditor />}
      {page === "people" && <PeoplePage />}
      {page === "leads" && <LeadsView title="Все заявки с сайта" />}
    </div>
  );
}
