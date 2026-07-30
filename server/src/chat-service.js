// ══════════════════════════════════════════════════════════════════
// ЛОГИКА ЧАТА
//
// Главные правила:
//  • у каждого посетителя сайта — свой отдельный диалог (по sessionId,
//    который сохраняется в его браузере);
//  • новый диалог случайно назначается одному из операторов,
//    которые сейчас онлайн (если никого нет — попадает в общую очередь
//    и назначается первому, кто выйдет на смену);
//  • оператор видит и отвечает только в своих диалогах.
// ══════════════════════════════════════════════════════════════════

import { nanoid } from "nanoid";
import db from "./db.js";

// Кто из операторов сейчас онлайн: Map<operatorId, количество вкладок>
const onlineOperators = new Map();

export function setOperatorOnline(operatorId) {
  onlineOperators.set(operatorId, (onlineOperators.get(operatorId) || 0) + 1);
}

export function setOperatorOffline(operatorId) {
  const n = (onlineOperators.get(operatorId) || 1) - 1;
  if (n <= 0) onlineOperators.delete(operatorId);
  else onlineOperators.set(operatorId, n);
}

export function isOperatorOnline(operatorId) {
  return onlineOperators.has(operatorId);
}

export function getOnlineOperatorIds() {
  return [...onlineOperators.keys()];
}

/**
 * Выбрать оператора для новой заявки или диалога — СЛУЧАЙНО среди тех,
 * кто сейчас онлайн. Если онлайн никого нет — случайно среди всех
 * (чтобы обращение не потерялось; оператор увидит его, когда войдёт).
 */
export function pickOperator() {
  const data = db.read();
  const allOperators = data.operators.map((o) => o.id);
  if (!allOperators.length) return null; // операторов ещё не создали

  // Распределяем ЧЕСТНО среди ВСЕХ операторов (не только онлайн) —
  // чтобы обращения не сваливались одному человеку, который сейчас
  // на смене. Оператор увидит свои диалоги, когда войдёт в кабинет.
  //
  // Балансировка: считаем, сколько диалогов уже у каждого оператора,
  // и отдаём новый тому, у кого их меньше всего. При равенстве —
  // выбираем случайно, чтобы не было перекоса на первого в списке.

  const load = new Map(allOperators.map((id) => [id, 0]));
  for (const chat of data.chats) {
    if (chat.operatorId && load.has(chat.operatorId)) {
      load.set(chat.operatorId, load.get(chat.operatorId) + 1);
    }
  }

  // минимальная нагрузка среди всех операторов
  const minLoad = Math.min(...load.values());
  // все операторы с минимальной нагрузкой
  const leastBusy = allOperators.filter((id) => load.get(id) === minLoad);

  // среди наименее загруженных приоритет тем, кто сейчас онлайн
  const onlineLeastBusy = leastBusy.filter((id) => isOperatorOnline(id));
  const pool = onlineLeastBusy.length ? onlineLeastBusy : leastBusy;

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Найти диалог по sessionId посетителя или создать новый.
 * Возвращает объект диалога.
 */
export function getOrCreateChat(sessionId, meta = {}) {
  const data = db.read();
  let chat = data.chats.find((c) => c.sessionId === sessionId);

  if (chat) {
    // если оператора удалили — переназначим диалог
    if (chat.operatorId && !data.operators.some((o) => o.id === chat.operatorId)) {
      chat.operatorId = pickOperator();
    }
    // если оператора не было (никого не создали в момент обращения) — попробуем снова
    if (!chat.operatorId) chat.operatorId = pickOperator();
    // если посетитель заново заполнил анкету — обновляем данные
    if (meta.name) {
      chat.visitor = {
        name: meta.name,
        email: meta.email || chat.visitor?.email || "",
        organization: meta.organization || chat.visitor?.organization || "",
        phone: meta.phone || chat.visitor?.phone || "",
      };
      chat.visitorName = meta.name;
    }
    db.write();
    return chat;
  }

  chat = {
    id: nanoid(10),
    sessionId,
    operatorId: pickOperator(),
    // анкета, которую посетитель заполняет перед началом чата
    visitor: {
      name: meta.name || "",
      email: meta.email || "",
      organization: meta.organization || "",
      phone: meta.phone || "",
    },
    visitorName: meta.name || "Посетитель сайта",
    lang: meta.lang || "ru",
    page: meta.page || "",
    createdAt: new Date().toISOString(),
    unreadForOperator: 0,
    messages: [],
  };
  data.chats.push(chat);
  db.write();
  return chat;
}

/** Добавить сообщение в диалог. from: "client" | "operator" | "system" */
export function addMessage(chatId, from, text, authorName = "") {
  const data = db.read();
  const chat = data.chats.find((c) => c.id === chatId);
  if (!chat) return null;

  const message = {
    id: nanoid(8),
    from,
    text: String(text).slice(0, 4000),
    authorName,
    at: new Date().toISOString(),
  };
  chat.messages.push(message);
  if (from === "client") chat.unreadForOperator = (chat.unreadForOperator || 0) + 1;
  chat.lastAt = message.at;
  db.write();
  return { chat, message };
}

/** Пометить диалог прочитанным оператором */
export function markRead(chatId) {
  const data = db.read();
  const chat = data.chats.find((c) => c.id === chatId);
  if (chat) {
    chat.unreadForOperator = 0;
    db.write();
  }
  return chat;
}

/** Диалоги конкретного оператора (краткий список для боковой панели) */
export function chatsForOperator(operatorId) {
  return db
    .read()
    .chats.filter((c) => c.operatorId === operatorId)
    .map((c) => ({
      id: c.id,
      visitorName: c.visitorName,
      visitor: c.visitor || {},
      lang: c.lang,
      page: c.page,
      createdAt: c.createdAt,
      lastAt: c.lastAt || c.createdAt,
      unread: c.unreadForOperator || 0,
      lastMessage: c.messages.length ? c.messages[c.messages.length - 1].text.slice(0, 80) : "",
    }))
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
}

/** Имя оператора по его идентификатору (показывается посетителю сайта) */
export function operatorName(operatorId) {
  const op = db.read().operators.find((o) => o.id === operatorId);
  return op ? op.name : "";
}

/** Проверка: этот оператор принадлежит этому менеджеру? */
export function operatorBelongsToManager(operatorId, managerId) {
  const op = db.read().operators.find((o) => o.id === operatorId);
  return Boolean(op && op.managerId === managerId);
}

/** Статистика по оператору — для кабинета менеджера и админ-панели */
export function operatorStats(operatorId) {
  const data = db.read();
  const chats = data.chats.filter((c) => c.operatorId === operatorId);
  const leads = data.leads.filter((l) => l.operatorId === operatorId);
  return {
    chats: chats.length,
    messages: chats.reduce((sum, c) => sum + c.messages.filter((m) => m.from === "client").length, 0),
    unread: chats.reduce((sum, c) => sum + (c.unreadForOperator || 0), 0),
    leads: leads.length,
    newLeads: leads.filter((l) => l.status === "new").length,
    online: isOperatorOnline(operatorId),
  };
}
