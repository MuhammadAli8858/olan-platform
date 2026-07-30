// ══════════════════════════════════════════════════════════════════
// АВТОРИЗАЦИЯ И РОЛИ
//
// Три роли:
//   admin    — задан в config.js (через код), полный доступ
//   manager  — создаёт админ; управляет своими операторами
//   operator — создаёт менеджер или админ; отвечает в чате
//
// Пароли хранятся только в виде хеша (bcrypt), в открытом виде нигде.
// ══════════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ADMIN, JWT_SECRET, TOKEN_HOURS } from "./config.js";
import db from "./db.js";

/** Захешировать пароль перед сохранением */
export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

/** Выдать токен входа */
export function issueToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: `${TOKEN_HOURS}h` }
  );
}

/** Проверить токен, вернуть данные пользователя или null */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Вход по email + паролю.
 * Возвращает { token, user } либо null, если данные неверные.
 */
export function login(email, password) {
  const mail = String(email || "").trim().toLowerCase();
  const pass = String(password || "");

  // 1. Администратор — логин и пароль заданы в config.js
  if (mail === ADMIN.email.toLowerCase() && pass === ADMIN.password) {
    const user = { id: "admin", role: "admin", name: ADMIN.name, email: ADMIN.email };
    return { token: issueToken(user), user };
  }

  const data = db.read();

  // 2. Менеджер
  const manager = data.managers.find((m) => m.email.toLowerCase() === mail);
  if (manager && bcrypt.compareSync(pass, manager.passwordHash)) {
    const user = { id: manager.id, role: "manager", name: manager.name, email: manager.email };
    return { token: issueToken(user), user };
  }

  // 3. Оператор
  const operator = data.operators.find((o) => o.email.toLowerCase() === mail);
  if (operator && bcrypt.compareSync(pass, operator.passwordHash)) {
    const user = {
      id: operator.id,
      role: "operator",
      name: operator.name,
      email: operator.email,
      managerId: operator.managerId,
    };
    return { token: issueToken(user), user };
  }

  return null;
}

/** Middleware: требует вход. Роли — список разрешённых, пустой = любая */
export function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const user = token ? verifyToken(token) : null;

    if (!user) return res.status(401).json({ error: "Требуется вход в систему" });
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: "Недостаточно прав доступа" });
    }
    req.user = user;
    next();
  };
}
