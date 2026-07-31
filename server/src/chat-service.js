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
/**
 * Выбрать оператора для нового обращения.
 *
 * Главное правило: обращения идут ТОЛЬКО тем, кто сейчас на смене.
 *  • один оператор на смене — всё достаётся ему;
 *  • несколько — распределяем поровну;
 *  • никого нет на смене — возвращаем null, обращение ждёт.
 *    Как только оператор выйдет на смену, оно достанется ему
 *    (этим занимается функция assignPending ниже).
 *
 * Что считается нагрузкой: только НЕЗАКРЫТЫЕ дела — заявки со
 * статусом «новая» и диалоги с непрочитанными сообщениями.
 * Обработанные обращения нагрузку не создают, поэтому оператор,
 * который быстро всё разобрал, снова получает обращения наравне.
 *
 * При равной нагрузке работает чередование по кругу — так двое
 * на смене получают обращения по очереди, а не случайными сериями.
 */
let rotationCursor = 0;

export function pickOperator() {
  const data = db.read();

  // только те, кто сейчас в кабинете, и кто ещё существует в базе
  const online = getOnlineOperatorIds().filter((id) =>
    data.operators.some((o) => o.id === id)
  );
  if (!online.length) return null; // никого нет на смене — обращение подождёт
  if (online.length === 1) return online[0]; // один на смене — всё ему

  // текущая нагрузка: незакрытые заявки и диалоги, ждущие ответа
  const load = new Map(online.map((id) => [id, 0]));
  for (const chat of data.chats) {
    if (load.has(chat.operatorId) && (chat.unreadForOperator || 0) > 0) {
      load.set(chat.operatorId, load.get(chat.operatorId) + 1);
    }
  }
  for (const lead of data.leads) {
    if (load.has(lead.operatorId) && lead.status === "new") {
      load.set(lead.operatorId, load.get(lead.operatorId) + 1);
    }
  }

  const minLoad = Math.min(...load.values());
  const leastBusy = online.filter((id) => load.get(id) === minLoad);

  // чередуем по кругу — обращения идут по очереди
  const chosen = leastBusy[rotationCursor % leastBusy.length];
  rotationCursor = (rotationCursor + 1) % 1000;
  return chosen;
}

/**
 * Найти оператора, который УЖЕ ведёт этого клиента.
 *
 * Нужно, чтобы заявка с формы попала тому же человеку, с кем клиент
 * до этого переписывался в чате (и наоборот). Узнаём клиента двумя
 * способами: по номеру сессии браузера и по электронной почте.
 *
 * ВАЖНО: возвращаем такого оператора, ТОЛЬКО если он сейчас на смене.
 * Иначе обращение зависнет у того, кого нет в кабинете, — а клиент
 * будет ждать ответа. Если «свой» оператор не на смене, вызывающий
 * код отдаст обращение свободному оператору из тех, кто на смене.
 */
export function findOperatorForVisitor({ sessionId, email }) {
  const data = db.read();
  const mail = String(email || "").trim().toLowerCase();

  // оператор подходит, только если существует И сейчас на смене
  const available = (id) =>
    id && data.operators.some((o) => o.id === id) && isOperatorOnline(id);

  // 1. По номеру сессии — самый надёжный признак того же посетителя
  if (sessionId) {
    const chat = data.chats.find((c) => c.sessionId === sessionId && available(c.operatorId));
    if (chat) return chat.operatorId;
  }

  // 2. По почте: клиент мог писать с телефона, а заявку отправить с компьютера
  if (mail) {
    const chat = [...data.chats]
      .reverse()
      .find((c) => String(c.visitor?.email || "").toLowerCase() === mail && available(c.operatorId));
    if (chat) return chat.operatorId;

    const lead = [...data.leads]
      .reverse()
      .find((l) => String(l.email || "").toLowerCase() === mail && available(l.operatorId));
    if (lead) return lead.operatorId;
  }

  return null;
}

/**
 * Раздать обращения тем, кто сейчас на смене.
 *
 * Вызывается, когда оператор выходит на смену, и при каждом новом
 * обращении. Делает две вещи:
 *
 *  1. Раздаёт обращения, которые вообще никому не назначены
 *     (пришли, когда в кабинете никого не было).
 *
 *  2. Забирает НЕОБРАБОТАННЫЕ обращения у операторов, которых сейчас
 *     нет на смене, и передаёт тем, кто на смене. Это главное правило:
 *     клиент не должен ждать ответа от человека, который ушёл домой.
 *
 *     Что переносится:
 *       • заявки со статусом «новая» (никто ещё не занялся);
 *       • диалоги, где есть непрочитанные сообщения от клиента.
 *     Что НЕ трогаем:
 *       • обработанные заявки — они уже в работе или закрыты;
 *       • диалоги без новых сообщений — переписка завершена.
 *
 * Возвращает { chats, leads } — сколько чего передано.
 */
export function assignPending() {
  const data = db.read();
  const online = getOnlineOperatorIds().filter((id) =>
    data.operators.some((o) => o.id === id)
  );
  if (!online.length) return { chats: 0, leads: 0 };

  // оператор доступен, если существует и сейчас на смене
  const available = (id) =>
    id && data.operators.some((o) => o.id === id) && isOperatorOnline(id);

  let chats = 0;
  let leads = 0;

  // ─── Диалоги ───
  for (const chat of data.chats) {
    if (available(chat.operatorId)) continue; // оператор на смене — не трогаем

    // диалог без новых сообщений оставляем как есть: переписка закончена,
    // а история должна храниться у того, кто её вёл
    const waiting = (chat.unreadForOperator || 0) > 0;
    if (chat.operatorId && !waiting) continue;

    const next =
      findOperatorForVisitor({ sessionId: chat.sessionId, email: chat.visitor?.email }) ||
      pickOperator();
    if (next && next !== chat.operatorId) {
      chat.operatorId = next;
      chats++;
    }
  }

  // ─── Заявки ───
  for (const lead of data.leads) {
    if (available(lead.operatorId)) continue; // оператор на смене — не трогаем
    if (lead.operatorId && lead.status !== "new") continue; // уже обработана

    const next =
      findOperatorForVisitor({ sessionId: lead.sessionId, email: lead.email }) ||
      pickOperator();
    if (next && next !== lead.operatorId) {
      lead.operatorId = next;
      leads++;
    }
  }

  if (chats || leads) db.write();
  return { chats, leads };
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
      chat.operatorId = null;
    }
    // Кому вести диалог дальше:
    //  • оператор на смене — оставляем как есть, клиент продолжает с ним;
    //  • оператора нет на смене (ушёл домой, закрыл кабинет) — передаём
    //    тому, кто на смене, чтобы клиент не ждал ответа впустую;
    //  • на смене никого — диалог ждёт, его раздадут при выходе на смену.
    if (!isOperatorOnline(chat.operatorId)) {
      const next =
        findOperatorForVisitor({ sessionId, email: meta.email || chat.visitor?.email }) ||
        pickOperator();
      if (next) chat.operatorId = next;
    }
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
    // если клиент уже общался с кем-то из операторов — возвращаем его туда же
    operatorId:
      findOperatorForVisitor({ sessionId, email: meta.email }) || pickOperator(),
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
