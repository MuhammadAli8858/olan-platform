// ══════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ ФАЙЛ СЕРВЕРА
// Обслуживает все три сайта:
//   • главный сайт      — чат посетителей, заявки, содержимое страниц
//   • кабинеты          — вход операторов и менеджеров, переписка
//   • админ-панель      — редактирование сайта и управление людьми
//
// Запуск:  npm start   (порт 4000)
// ══════════════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { Server as SocketServer } from "socket.io";
import { nanoid } from "nanoid";

import { PORT, ALLOWED_ORIGINS, ADMIN } from "./config.js";
import db from "./db.js";
import { login, requireAuth, hashPassword, verifyToken } from "./auth.js";
import * as chatService from "./chat-service.js";
import { LANGS } from "./seed-content.js";
import { syncAllLanguages, collect, get } from "./content-sync.js";
import { autoTranslateIfNeeded } from "./auto-translate.js";
import { translationEnabled, translationInfo } from "./translate.js";
import { TRANSLATE } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);

// ══════════════════════════════════════════════════════════════════
// CORS — доступ сайтов к серверу
//
// По умолчанию доступ разрешён с ЛЮБОГО адреса. Это осознанное
// решение, а не упрощение:
//
//  • вход защищён токеном в заголовке Authorization, а не cookie —
//    чужой сайт не может выполнить запрос от имени вашего оператора,
//    потому что не имеет доступа к токену в другом домене;
//  • проверка источника не защищает сервер: любой запрос из консоли,
//    curl или программы её просто не отправляет — она действует
//    только в браузере;
//  • часть адресов и должна быть открыта всем: содержимое сайта
//    и форма заявки работают для любого посетителя.
//
// Зато отпадает целый класс поломок: сменили адрес сайта, добавили
// поддомен, опечатались в слэше — всё продолжает работать.
//
// Если всё же нужен строгий список (например, требование службы
// безопасности заказчика) — задайте переменную окружения
// CORS_STRICT=true, тогда сервер начнёт пускать только адреса
// из ALLOWED_ORIGINS.
// ══════════════════════════════════════════════════════════════════

const CORS_STRICT = String(process.env.CORS_STRICT || "").toLowerCase() === "true";

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);          // curl, мобильные приложения
    if (!CORS_STRICT) return cb(null, true);     // обычный режим — пускаем всех

    // строгий режим: сверяемся со списком, не придираясь
    // к слэшу на конце и регистру букв
    const clean = origin.replace(/\/+$/, "").toLowerCase();
    if (ALLOWED_ORIGINS.includes(clean)) return cb(null, true);

    console.warn(
      `[CORS] отклонён источник: ${origin}\n` +
      `       разрешены: ${ALLOWED_ORIGINS.join(", ") || "(список пуст!)"}\n` +
      `       добавьте адрес в ALLOWED_ORIGINS или уберите CORS_STRICT`
    );
    // Отвечаем БЕЗ разрешающего заголовка, но не ошибкой сервера —
    // так в консоли браузера видно понятную причину.
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

// ─── Загрузка логотипов партнёров и фото проектов ──────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, nanoid(8) + path.extname(file.originalname)),
  }),
  limits: { fileSize: 4 * 1024 * 1024 }, // до 4 МБ
});

// ══════════════════════════════════════════════════════════════════
// ПРОВЕРКА РАБОТОСПОСОБНОСТИ
// По этому адресу хостинг (Render, Docker и т.п.) проверяет,
// что сервер жив. Также удобно открыть в браузере, чтобы убедиться,
// что сервер запущен: https://ваш-сервер/api/health
// ══════════════════════════════════════════════════════════════════

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "OLAN HIGH TECH server",
    // по этой строке видно, какая версия кода сейчас развёрнута —
    // удобно проверять после обновления на Render
    version: "2026.08-shift-routing",
    // кто сейчас на смене — сразу видно, кому пойдут новые обращения
    operatorsOnShift: chatService.getOnlineOperatorIds().length,
    time: new Date().toISOString(),
  });
});

// ══════════════════════════════════════════════════════════════════
// ВХОД В СИСТЕМУ
// ══════════════════════════════════════════════════════════════════

app.post("/api/auth/login", (req, res) => {
  const result = login(req.body.email, req.body.password);
  if (!result) return res.status(401).json({ error: "Неверная почта или пароль" });
  res.json(result);
});

app.get("/api/auth/me", requireAuth(), (req, res) => res.json({ user: req.user }));

// ══════════════════════════════════════════════════════════════════
// СОДЕРЖИМОЕ САЙТА (CMS) — читают все, меняет только админ
// ══════════════════════════════════════════════════════════════════

/** Публичное чтение: /api/content?lang=ru — с откатом на русский */
app.get("/api/content", (req, res) => {
  const lang = String(req.query.lang || "ru");
  const content = db.read().content;
  res.json({
    lang,
    langs: LANGS,
    // если перевода нет — отдаём русскую версию
    data: content[lang] || content.ru,
    translated: Boolean(content[lang]),
  });
});

/** Все языки сразу — для админ-панели */
app.get("/api/content/all", requireAuth(["admin"]), (_req, res) => {
  res.json({ langs: LANGS, content: db.read().content });
});

/**
 * Сохранить содержимое языка И РАЗНЕСТИ ЕГО ПО ВСЕМ 9 ЯЗЫКАМ.
 *
 * ?propagate=false — сохранить только этот язык (без синхронизации)
 * ?force=true      — перезаписать даже переводы, сделанные вручную
 */
app.put("/api/content/:lang", requireAuth(["admin"]), async (req, res) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return res.status(400).json({ error: "Неизвестный язык" });

  const propagate = req.query.propagate !== "false";
  const force = req.query.force === "true";

  const data = db.read();
  data.content[lang] = req.body;
  if (!data.snapshots) data.snapshots = {};

  let report = {};
  if (propagate) {
    try {
      const result = await syncAllLanguages(data.content, data.snapshots, lang, LANGS, force);
      data.content = result.content;
      data.snapshots = result.snapshots;
      report = result.report;
    } catch (err) {
      console.error("[синхронизация языков]", err.message);
    }
  }

  db.write();
  res.json({
    ok: true,
    propagated: propagate,
    translated: translationEnabled(),
    provider: TRANSLATE.provider,
    report,
  });
});

/**
 * Перевести всё заново с выбранного языка на остальные.
 * Перезаписывает в том числе ручные переводы.
 */
app.post("/api/content/:lang/retranslate", requireAuth(["admin"]), async (req, res) => {
  const { lang } = req.params;
  if (!LANGS.includes(lang)) return res.status(400).json({ error: "Неизвестный язык" });

  const data = db.read();
  if (!data.content[lang]) return res.status(400).json({ error: "У этого языка ещё нет содержимого" });
  if (!data.snapshots) data.snapshots = {};

  // ?mode=fill — допереводить только то, что осталось на русском
  // (ручные переводы не трогаем). Без параметра — перевести всё заново.
  const fill = req.query.mode === "fill";

  try {
    // До трёх проходов: переводчик может не осилить всё за один раз.
    // Останавливаемся, когда прогресса больше нет.
    let report = {};
    let prevLeft = Infinity;

    for (let pass = 1; pass <= 3; pass++) {
      const result = await syncAllLanguages(
        data.content, data.snapshots, lang, LANGS, !fill, fill ? "fill" : "sync"
      );
      data.content = result.content;
      data.snapshots = result.snapshots;
      db.write();
      report = result.report;

      const left = LANGS.filter((l) => l !== lang)
        .reduce((n, l) => n + untranslatedCount(data.content, l), 0);
      if (left === 0 || left >= prevLeft) break;
      prevLeft = left;
    }

    const remaining = Object.fromEntries(
      LANGS.filter((l) => l !== lang).map((l) => [l, untranslatedCount(data.content, l)])
    );

    res.json({ ok: true, ...translationInfo(), report, remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Сколько строк на языке осталось непереведёнными.
 * Считаем те переводимые поля, что до сих пор равны русскому
 * исходнику и содержат русские буквы.
 */
function untranslatedCount(content, lang) {
  const cur = content[lang];
  if (!cur) return 0;
  return collect(content.ru).filter(
    ({ path, value }) => get(cur, path) === value && /[А-Яа-яЁё]/.test(value)
  ).length;
}

/** Состояние перевода — для подсказки в админ-панели */
app.get("/api/content/translation-status", requireAuth(["admin"]), (_req, res) => {
  const data = db.read();
  res.json({
    ...translationInfo(), // provider, enabled, smart, label
    langs: LANGS.map((l) => ({
      code: l,
      filled: Boolean(data.content[l]),
      untranslated: l === "ru" ? 0 : untranslatedCount(data.content, l),
    })),
  });
});

/** Загрузка картинки (логотип партнёра, фото проекта) */
app.post("/api/upload", requireAuth(["admin"]), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ══════════════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ ЛЮДЬМИ
//   админ   → создаёт и удаляет менеджеров и операторов
//   менеджер → создаёт и удаляет только своих операторов
// ══════════════════════════════════════════════════════════════════

const publicUser = (u, role) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role,
  managerId: u.managerId,
  createdAt: u.createdAt,
  stats: role === "operator" ? chatService.operatorStats(u.id) : undefined,
});

/** Список операторов: менеджер видит своих, админ — всех */
app.get("/api/users/operators", requireAuth(["manager", "admin"]), (req, res) => {
  const all = db.read().operators;
  const list = req.user.role === "admin" ? all : all.filter((o) => o.managerId === req.user.id);
  res.json(list.map((o) => publicUser(o, "operator")));
});

/** Создать оператора: имя + почта + пароль (пароль задаёт менеджер) */
app.post("/api/users/operators", requireAuth(["manager", "admin"]), (req, res) => {
  const { name, email, password, managerId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Укажите имя, почту и пароль" });
  }
  const data = db.read();

  // К какому менеджеру привязать оператора.
  // Менеджер привязывает к себе. Админ ОБЯЗАН выбрать менеджера —
  // оператор без менеджера не создаётся (иначе он «теряется» в системе).
  const targetManagerId = req.user.role === "manager" ? req.user.id : managerId;
  if (!targetManagerId) {
    return res.status(400).json({ error: "Выберите менеджера, к которому привязать оператора" });
  }
  if (!data.managers.some((m) => m.id === targetManagerId)) {
    return res.status(400).json({ error: "Указанный менеджер не найден" });
  }

  const mail = String(email).trim().toLowerCase();
  const exists =
    data.operators.some((o) => o.email.toLowerCase() === mail) ||
    data.managers.some((m) => m.email.toLowerCase() === mail) ||
    mail === ADMIN.email.toLowerCase();
  if (exists) return res.status(409).json({ error: "Такая почта уже используется" });

  const operator = {
    id: nanoid(10),
    name: String(name).trim(),
    email: mail,
    passwordHash: hashPassword(password),
    managerId: targetManagerId,
    createdAt: new Date().toISOString(),
  };
  db.update((d) => d.operators.push(operator));
  res.json(publicUser(operator, "operator"));
});

/** Удалить оператора */
app.delete("/api/users/operators/:id", requireAuth(["manager", "admin"]), (req, res) => {
  const data = db.read();
  const operator = data.operators.find((o) => o.id === req.params.id);
  if (!operator) return res.status(404).json({ error: "Оператор не найден" });
  if (req.user.role === "manager" && operator.managerId !== req.user.id) {
    return res.status(403).json({ error: "Это оператор другого менеджера" });
  }
  db.update((d) => {
    d.operators = d.operators.filter((o) => o.id !== req.params.id);
    // диалоги и заявки удалённого оператора перераспределим
    d.chats.forEach((c) => {
      if (c.operatorId === req.params.id) c.operatorId = null;
    });
    d.leads.forEach((l) => {
      if (l.operatorId === req.params.id) l.operatorId = null;
    });
  });
  res.json({ ok: true });
});

/** Сменить пароль оператора (менеджер контролирует доступ) */
app.patch("/api/users/operators/:id/password", requireAuth(["manager", "admin"]), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: "Пароль слишком короткий" });
  const data = db.read();
  const operator = data.operators.find((o) => o.id === req.params.id);
  if (!operator) return res.status(404).json({ error: "Оператор не найден" });
  if (req.user.role === "manager" && operator.managerId !== req.user.id) {
    return res.status(403).json({ error: "Это оператор другого менеджера" });
  }
  db.update(() => {
    operator.passwordHash = hashPassword(password);
  });
  res.json({ ok: true });
});

/** Список менеджеров — только админ */
app.get("/api/users/managers", requireAuth(["admin"]), (_req, res) => {
  res.json(db.read().managers.map((m) => publicUser(m, "manager")));
});

/** Создать менеджера — только админ (логин и пароль задаёт админ) */
app.post("/api/users/managers", requireAuth(["admin"]), (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Укажите имя, почту и пароль" });
  }
  const data = db.read();
  const mail = String(email).trim().toLowerCase();
  const exists =
    data.managers.some((m) => m.email.toLowerCase() === mail) ||
    data.operators.some((o) => o.email.toLowerCase() === mail) ||
    mail === ADMIN.email.toLowerCase();
  if (exists) return res.status(409).json({ error: "Такая почта уже используется" });

  const manager = {
    id: nanoid(10),
    name: String(name).trim(),
    email: mail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.update((d) => d.managers.push(manager));
  res.json(publicUser(manager, "manager"));
});

/** Удалить менеджера (его операторы остаются, но без менеджера) */
app.delete("/api/users/managers/:id", requireAuth(["admin"]), (req, res) => {
  const data = db.read();

  // Оператор не может остаться без менеджера. Поэтому перед удалением
  // находим, к кому перевести его операторов.
  const others = data.managers.filter((m) => m.id !== req.params.id);
  const orphans = data.operators.filter((o) => o.managerId === req.params.id);

  // Если это ЕДИНСТВЕННЫЙ менеджер и у него есть операторы — удалять нельзя,
  // иначе операторам некуда переехать.
  if (!others.length && orphans.length) {
    return res.status(400).json({
      error: "Это единственный менеджер, а у него есть операторы. Сначала создайте другого менеджера, чтобы перевести операторов к нему.",
    });
  }

  db.update((d) => {
    d.managers = d.managers.filter((m) => m.id !== req.params.id);

    // Равномерно распределяем «осиротевших» операторов по остальным
    // менеджерам: считаем, у кого сейчас меньше операторов, и отдаём туда.
    const movedOperators = d.operators.filter((o) => o.managerId === req.params.id);
    for (const op of movedOperators) {
      // пересчитываем нагрузку каждый раз, чтобы распределить поровну
      const counts = d.managers.map((m) => ({
        id: m.id,
        n: d.operators.filter((o) => o.managerId === m.id).length,
      }));
      counts.sort((a, b) => a.n - b.n);
      op.managerId = counts[0].id; // менеджеру с наименьшим числом операторов
    }
  });

  const target = others.length ? others : [];
  res.json({
    ok: true,
    moved: orphans.length,
    // сообщим админу, куда переехали операторы
    message: orphans.length
      ? `Операторов перемещено: ${orphans.length}. Они привязаны к другим менеджерам.`
      : undefined,
  });
});

/** Сменить пароль менеджера */
app.patch("/api/users/managers/:id/password", requireAuth(["admin"]), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: "Пароль слишком короткий" });
  const data = db.read();
  const manager = data.managers.find((m) => m.id === req.params.id);
  if (!manager) return res.status(404).json({ error: "Менеджер не найден" });
  db.update(() => {
    manager.passwordHash = hashPassword(password);
  });
  res.json({ ok: true });
});

/** Дерево «менеджеры → их операторы» со счётчиками — для админ-панели */
app.get("/api/users/tree", requireAuth(["admin"]), (_req, res) => {
  const data = db.read();
  const tree = data.managers.map((m) => ({
    ...publicUser(m, "manager"),
    operators: data.operators.filter((o) => o.managerId === m.id).map((o) => publicUser(o, "operator")),
  }));
  const orphans = data.operators.filter((o) => !o.managerId).map((o) => publicUser(o, "operator"));
  res.json({ managers: tree, withoutManager: orphans });
});

// ══════════════════════════════════════════════════════════════════
// ЗАЯВКИ С ФОРМЫ «ЗАПРОСИТЬ КОНСУЛЬТАЦИЮ»
// Приходят с главного сайта и случайно назначаются оператору
// ══════════════════════════════════════════════════════════════════

app.post("/api/leads", (req, res) => {
  const { name, organization, email, phone, message, page, lang, sessionId } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Укажите имя и почту" });

  // Кому отдать заявку:
  //  1. если клиент уже переписывался в чате — тому же оператору,
  //     чтобы человек не пересказывал всё заново;
  //  2. иначе — свободному оператору из тех, кто сейчас на смене;
  //  3. если на смене никого — заявка ждёт (operatorId = null)
  //     и достанется первому, кто выйдет на смену.
  const ownOperator = chatService.findOperatorForVisitor({ sessionId, email });

  const lead = {
    id: nanoid(10),
    sessionId: String(sessionId || ""),
    name: String(name).slice(0, 200),
    organization: String(organization || "").slice(0, 200),
    email: String(email).slice(0, 200),
    phone: String(phone || "").slice(0, 60),
    message: String(message || "").slice(0, 4000),
    page: String(page || ""),
    lang: String(lang || "ru"),
    operatorId: ownOperator || chatService.pickOperator(),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  db.update((d) => d.leads.push(lead));

  // мгновенно уведомляем назначенного оператора
  if (lead.operatorId) io.to(`op:${lead.operatorId}`).emit("lead:new", lead);

  res.json({ ok: true, id: lead.id });
});

/**
 * Заявки с формы «Запросить консультацию».
 *   оператор  — видит только свои
 *   менеджер  — все заявки своих операторов
 *   админ     — все заявки платформы
 *
 * Менеджер и админ дополнительно видят, какому оператору
 * назначена каждая заявка.
 */
app.get("/api/leads", requireAuth(["operator", "manager", "admin"]), (req, res) => {
  const data = db.read();
  let list = data.leads;

  if (req.user.role === "operator") {
    list = list.filter((l) => l.operatorId === req.user.id);
  } else if (req.user.role === "manager") {
    const mine = data.operators.filter((o) => o.managerId === req.user.id).map((o) => o.id);
    // заявки своих операторов + пока не назначенные никому
    list = list.filter((l) => mine.includes(l.operatorId) || !l.operatorId);
  }

  // добавляем имя оператора и менеджера — для кабинета менеджера и админки
  const withNames = list.map((l) => {
    const op = data.operators.find((o) => o.id === l.operatorId);
    const mgr = op ? data.managers.find((m) => m.id === op.managerId) : null;
    return {
      ...l,
      operatorName: op ? op.name : "",
      managerName: mgr ? mgr.name : "",
      // была ли переписка с этим клиентом в чате
      hasChat: data.chats.some(
        (c) =>
          (l.sessionId && c.sessionId === l.sessionId) ||
          (l.email && String(c.visitor?.email || "").toLowerCase() === l.email.toLowerCase())
      ),
    };
  });

  res.json(withNames.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

/** Отметить заявку обработанной */
app.patch("/api/leads/:id", requireAuth(["operator", "manager", "admin"]), (req, res) => {
  const data = db.read();
  const lead = data.leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: "Заявка не найдена" });
  db.update(() => {
    lead.status = req.body.status || "done";
  });
  res.json(lead);
});

// ══════════════════════════════════════════════════════════════════
// ЧАТ — СПИСКИ И ИСТОРИЯ (реальное время — ниже, через сокеты)
// ══════════════════════════════════════════════════════════════════

/** Свои диалоги (для оператора) */
app.get("/api/chats", requireAuth(["operator"]), (req, res) => {
  res.json(chatService.chatsForOperator(req.user.id));
});

/**
 * Диалоги конкретного оператора — ДЛЯ ЧТЕНИЯ.
 * Менеджер может смотреть только своих операторов, админ — любых.
 * Отвечать в этих диалогах может только сам оператор.
 */
app.get("/api/chats/by-operator/:operatorId", requireAuth(["manager", "admin"]), (req, res) => {
  const { operatorId } = req.params;
  if (req.user.role === "manager" && !chatService.operatorBelongsToManager(operatorId, req.user.id)) {
    return res.status(403).json({ error: "Это оператор другого менеджера" });
  }
  res.json(chatService.chatsForOperator(operatorId));
});

/** Один диалог целиком с историей сообщений */
app.get("/api/chats/:id", requireAuth(["operator", "manager", "admin"]), (req, res) => {
  const chat = db.read().chats.find((c) => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: "Диалог не найден" });

  // оператор — только свои диалоги
  if (req.user.role === "operator" && chat.operatorId !== req.user.id) {
    return res.status(403).json({ error: "Это диалог другого оператора" });
  }
  // менеджер — только диалоги своих операторов
  if (req.user.role === "manager" && !chatService.operatorBelongsToManager(chat.operatorId, req.user.id)) {
    return res.status(403).json({ error: "Это диалог оператора другого менеджера" });
  }

  res.json({
    ...chat,
    operatorName: chatService.operatorName(chat.operatorId),
    // подсказка интерфейсу: читать можно, отвечать — нет
    readOnly: req.user.role !== "operator",
  });
});

// ══════════════════════════════════════════════════════════════════
// РЕАЛЬНОЕ ВРЕМЯ (Socket.IO)
//
// Комнаты:
//   chat:<id>  — посетитель сайта
//   op:<id>    — оператор (все его вкладки)
// ══════════════════════════════════════════════════════════════════

const io = new SocketServer(server, { cors: { origin: true, credentials: true } });

/** Отправить посетителю текущее состояние его диалога */
function sendState(socket, chat) {
  socket.emit("chat:state", {
    chatId: chat.id,
    messages: chat.messages,
    visitor: chat.visitor || {},
    operatorName: chatService.operatorName(chat.operatorId),
    operatorOnline: chat.operatorId ? chatService.isOperatorOnline(chat.operatorId) : false,
  });
}

io.on("connection", (socket) => {
  let role = null;
  let operatorId = null;
  let chatId = null;

  /**
   * Посетитель открыл сайт.
   * Если он уже заполнял анкету раньше — сразу открываем его диалог.
   * Если нет — просим заполнить анкету (событие chat:need-registration).
   */
  socket.on("client:hello", ({ sessionId }) => {
    role = "client";
    const existing = db.read().chats.find((c) => c.sessionId === sessionId);

    if (!existing) {
      socket.emit("chat:need-registration");
      return;
    }

    chatId = existing.id;
    socket.join(`chat:${existing.id}`);
    sendState(socket, existing);
  });

  /**
   * Посетитель заполнил анкету: имя, почта, организация, телефон.
   * Здесь создаётся диалог и назначается случайный оператор.
   */
  socket.on("client:register", (payload = {}) => {
    role = "client";
    const chat = chatService.getOrCreateChat(payload.sessionId, {
      name: payload.name,
      email: payload.email,
      organization: payload.organization,
      phone: payload.phone,
      lang: payload.lang,
      page: payload.page,
    });
    chatId = chat.id;
    socket.join(`chat:${chat.id}`);
    sendState(socket, chat);

    if (chat.operatorId) io.to(`op:${chat.operatorId}`).emit("chat:list-changed");
  });

  // ── Посетитель отправил сообщение ──
  socket.on("client:message", ({ text }) => {
    if (!chatId || !text?.trim()) return;
    const result = chatService.addMessage(chatId, "client", text.trim());
    if (!result) return;

    io.to(`chat:${chatId}`).emit("chat:message", result.message);

    // уведомление оператору (для всплывающего уведомления в браузере)
    if (result.chat.operatorId) {
      io.to(`op:${result.chat.operatorId}`).emit("operator:incoming", {
        chatId,
        visitorName: result.chat.visitorName,
        message: result.message,
      });
    }
  });

  // ── Оператор вошёл в кабинет ──
  socket.on("operator:auth", ({ token }) => {
    const user = verifyToken(token);
    if (!user || user.role !== "operator") return socket.emit("operator:auth-failed");
    role = "operator";
    operatorId = user.id;
    socket.join(`op:${operatorId}`);
    chatService.setOperatorOnline(operatorId);

    // Оператор вышел на смену — раздаём обращения, которые ждали,
    // пока в кабинете никого не было
    const pending = chatService.assignPending();
    if (pending.chats || pending.leads) {
      console.log(
        `  [смена] ${chatService.operatorName(operatorId)} вышел(а) на смену — ` +
        `распределено диалогов: ${pending.chats}, заявок: ${pending.leads}`
      );
      // обновим списки у всех, кто сейчас на смене
      for (const id of chatService.getOnlineOperatorIds()) {
        io.to(`op:${id}`).emit("chat:list-changed");
        io.to(`op:${id}`).emit("leads:changed");
      }
    }

    socket.emit("operator:ready", { chats: chatService.chatsForOperator(operatorId) });
  });

  // ── Оператор открыл диалог ──
  socket.on("operator:open-chat", ({ chatId: id }) => {
    if (role !== "operator") return;
    const chat = db.read().chats.find((c) => c.id === id && c.operatorId === operatorId);
    if (!chat) return;
    chatService.markRead(id);
    socket.emit("operator:chat-opened", chat);
  });

  // ── Оператор ответил ──
  socket.on("operator:message", ({ chatId: id, text }) => {
    if (role !== "operator" || !text?.trim()) return;
    const chat = db.read().chats.find((c) => c.id === id && c.operatorId === operatorId);
    if (!chat) return;

    // имя оператора видно посетителю сайта
    const name = chatService.operatorName(operatorId) || "Оператор";
    const result = chatService.addMessage(id, "operator", text.trim(), name);
    if (!result) return;

    // сообщение уходит посетителю сайта и во все вкладки оператора
    io.to(`chat:${id}`).emit("chat:message", result.message);
    io.to(`op:${operatorId}`).emit("operator:message-sent", { chatId: id, message: result.message });
  });

  // ── «Печатает…» ──
  socket.on("client:typing", () => {
    if (chatId) socket.to(`chat:${chatId}`).emit("peer:typing", { from: "client" });
  });
  socket.on("operator:typing", ({ chatId: id }) => {
    if (role === "operator" && id) io.to(`chat:${id}`).emit("peer:typing", { from: "operator" });
  });

  socket.on("disconnect", () => {
    if (role !== "operator" || !operatorId) return;

    chatService.setOperatorOffline(operatorId);

    // Оператор ушёл со смены — его необработанные обращения
    // передаём тем, кто остался в кабинете
    const moved = chatService.assignPending();
    if (moved.chats || moved.leads) {
      console.log(
        `  [смена] ${chatService.operatorName(operatorId)} ушёл(ла) со смены — ` +
        `передано диалогов: ${moved.chats}, заявок: ${moved.leads}`
      );
      for (const id of chatService.getOnlineOperatorIds()) {
        io.to(`op:${id}`).emit("chat:list-changed");
        io.to(`op:${id}`).emit("leads:changed");
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════

// через 2 секунды после старта — фоновый доперевод непереведённых текстов
setTimeout(() => autoTranslateIfNeeded(), 2000);

server.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║   OLAN HIGH TECH — сервер платформы запущен      ║");
  console.log("  ╚══════════════════════════════════════════════════╝");
  console.log(`  API и чат:      http://localhost:${PORT}`);
  console.log(`  Вход админа:    ${ADMIN.email}`);
  console.log(`  Пароль админа:  ${ADMIN.password}   (меняется в src/config.js)`);
  console.log("");
});
