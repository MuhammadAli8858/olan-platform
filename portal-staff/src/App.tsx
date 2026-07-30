// ══════════════════════════════════════════════════════════════════
// КОРЕНЬ ПРИЛОЖЕНИЯ КАБИНЕТОВ
// Один вход — дальше показывается нужный кабинет в зависимости от роли:
//   operator → кабинет оператора (чаты и заявки)
//   manager  → кабинет менеджера (операторы и счётчики)
// ══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { LoginScreen } from "./LoginScreen";
import { OperatorCabinet } from "./OperatorCabinet";
import { ManagerCabinet } from "./ManagerCabinet";
import { loadSession, type User } from "./lib";

export default function App() {
  const [user, setUser] = useState<User | null>(() => loadSession()?.user || null);

  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.role === "manager") return <ManagerCabinet user={user} onLogout={() => setUser(null)} />;
  return <OperatorCabinet user={user} onLogout={() => setUser(null)} />;
}
