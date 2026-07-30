// ══════════════════════════════════════════════════════════════════
// ЭКРАН ВХОДА
// Один вход для операторов и менеджеров — роль определяется сервером
// по учётной записи. Операторов создаёт менеджер, менеджеров — админ.
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Radar, LogIn } from "lucide-react";
import { API_URL, saveSession, type User } from "./lib";

export function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось войти");
      if (json.user.role === "admin") {
        throw new Error("Это вход для сотрудников. Администратор входит в админ-панели.");
      }
      saveSession(json.token, json.user);
      onLogin(json.user);
    } catch (err: any) {
      setError(err.message || "Сервер недоступен");
    } finally {
      setBusy(false);
    }
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
            <div className="tele" style={{ fontSize: 9, letterSpacing: ".2em", color: "var(--cyan)", marginTop: 2 }}>
              КАБИНЕТ СОТРУДНИКА
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Электронная почта</label>
          <input
            className="input" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@olanhightech.com"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Пароль</label>
          <input
            className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          <LogIn style={{ width: 15, height: 15 }} />
          {busy ? "Вход…" : "Войти в кабинет"}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: "var(--txt-3)", lineHeight: 1.6 }}>
          Доступ выдаёт менеджер (операторам) или администратор (менеджерам).
          Если вы не можете войти — обратитесь к своему руководителю.
        </p>
      </form>
    </div>
  );
}
