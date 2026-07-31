// ══════════════════════════════════════════════════════════════════
// ОБЩИЕ УТИЛИТЫ КАБИНЕТОВ
//  • адрес сервера
//  • запросы к API с токеном входа
//  • хранение входа между перезагрузками
//  • уведомления браузера
// ══════════════════════════════════════════════════════════════════

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "oht-admin-token";
const USER_KEY = "oht-admin-user";

export type Role = "operator" | "manager" | "admin";
export type User = { id: string; name: string; email: string; role: Role };

/** Сохранённый вход */
export function loadSession(): { token: string; user: User } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (token && user) return { token, user: JSON.parse(user) };
  } catch { /* ок */ }
  return null;
}

export function saveSession(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* ок */ }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ок */ }
}

/** Запрос к API с токеном. Бросает ошибку с понятным текстом. */
export async function api(path: string, options: RequestInit = {}) {
  const session = loadSession();

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    // Сюда попадаем, если сервер вообще не ответил: неверный адрес,
    // сервер не запущен, или запрос заблокирован настройкой ALLOWED_ORIGINS.
    // Показываем адрес — по нему сразу видно, куда стучался сайт.
    throw new Error(
      `Нет связи с сервером: ${API_URL}
` +
      `Проверьте, что сервер запущен (${API_URL}/api/health) ` +
      `и что адрес этого сайта указан в ALLOWED_ORIGINS на сервере.`
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Ошибка запроса к серверу");
  return json;
}

// ─── Уведомления браузера ────────────────────────────────────────

export function notifyPermission(): NotificationPermission {
  return "Notification" in window ? Notification.permission : "denied";
}

export async function askNotifyPermission() {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

/** Показать уведомление (если разрешено и вкладка неактивна) */
export function showNotification(title: string, body: string, onClick?: () => void) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) {
    // вкладка открыта — уведомление не нужно, звук достаточно
    playBeep();
    return;
  }
  try {
    const n = new Notification(title, { body: body.slice(0, 140), tag: "oht-staff" });
    n.onclick = () => { window.focus(); onClick?.(); n.close(); };
    playBeep();
  } catch { /* браузер может блокировать */ }
}

/** Короткий звуковой сигнал о новом сообщении */
export function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* звук недоступен */ }
}

/** Время в читаемом виде */
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
