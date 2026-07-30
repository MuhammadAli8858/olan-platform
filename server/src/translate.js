// ══════════════════════════════════════════════════════════════════
// СЛУЖБА ПЕРЕВОДА
//
// Когда администратор меняет текст на одном языке, изменение
// расходится по всем 9 языкам. Как именно переводить — зависит
// от выбранного поставщика (настраивается в config.js):
//
//   "google-free" — БЕСПЛАТНЫЙ переводчик Google без ключа и
//              регистрации (стоит по умолчанию). Переводит все
//              9 языков платформы. Нужен только интернет.
//
//   "none"   — без перевода: текст просто копируется на все языки
//              (работает всегда, без интернета и ключей).
//              Админ потом правит переводы вручную в панели.
//
//   "libre"  — LibreTranslate. Бесплатный и его можно поднять
//              на своём сервере. Ключ обычно не нужен.
//
//   "google" — Google Cloud Translation. Нужен ключ API.
//
//   "deepl"  — DeepL. Лучшее качество для европейских языков.
//              Нужен ключ API.
//
// Если поставщик не отвечает — служба не ломает сохранение,
// а просто копирует исходный текст (сайт никогда не останется пустым).
// ══════════════════════════════════════════════════════════════════

import { TRANSLATE } from "./config.js";

/** Коды языков для разных поставщиков (у DeepL свои обозначения) */
const DEEPL_CODES = {
  ru: "RU", en: "EN", de: "DE", zh: "ZH", uk: "UK",
  ar: "AR", uz: null, kk: null, be: null, // DeepL их не поддерживает
};

/**
 * Перевести список строк.
 * Возвращает массив той же длины (при ошибке — исходные строки).
 */
export async function translateBatch(texts, from, to) {
  if (!texts.length || from === to) return texts;

  const provider = TRANSLATE.provider;
  if (provider === "none") return texts; // копируем как есть

  try {
    if (provider === "google-free") return await viaGoogleFree(texts, from, to);
    if (provider === "libre") return await viaLibre(texts, from, to);
    if (provider === "google") return await viaGoogle(texts, from, to);
    if (provider === "deepl") return await viaDeepL(texts, from, to);
  } catch (err) {
    console.warn(`[перевод] ${from}→${to} не удался (${err.message}). Текст скопирован без перевода.`);
  }
  return texts;
}

// ─── Google-переводчик без ключа ──────────────────────────────────
// Использует открытую точку translate.googleapis.com (client=gtx).
// Ключ не нужен. Каждый текст переводится отдельным запросом,
// одновременно идёт не больше 4 запросов, при сбое — одна повторная
// попытка, при полном отказе текст остаётся как есть (не ломаем сайт).

async function gtxOne(text, from, to, attempt = 0) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx" +
    `&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (res.status === 429 && attempt === 0) {
    // слишком часто — подождём секунду и попробуем ещё раз
    await new Promise((r) => setTimeout(r, 1200));
    return gtxOne(text, from, to, 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // ответ: [[["перевод","оригинал",...], ["продолжение",...]], ...]
  return (json[0] || []).map((seg) => seg[0]).join("");
}

/**
 * Пакетный запрос: до 40 текстов за одно обращение к переводчику.
 * Так весь сайт переводится за ~30 запросов вместо трёх тысяч —
 * быстрее и без блокировок за частые обращения.
 */
async function gtxBatch(texts, from, to) {
  const url =
    "https://translate.googleapis.com/translate_a/t?client=gtx" +
    `&sl=${from}&tl=${to}&format=text`;
  const body = texts.map((t) => "q=" + encodeURIComponent(t)).join("&");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      "User-Agent": "Mozilla/5.0",
    },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // ответ: ["перевод1","перевод2"] или [["перевод1","ru"],["перевод2","ru"]]
  const list = Array.isArray(json) ? json : [json];
  return list.map((item) => (Array.isArray(item) ? item[0] : item));
}

async function viaGoogleFree(texts, from, to) {
  const out = new Array(texts.length);

  // режем на пакеты: не больше 40 текстов и ~8000 символов за запрос
  const chunks = [];
  let current = [];
  let size = 0;
  texts.forEach((t, i) => {
    if (current.length >= 40 || size + t.length > 8000) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push({ i, t });
    size += t.length;
  });
  if (current.length) chunks.push(current);

  for (const chunk of chunks) {
    try {
      const translated = await gtxBatch(chunk.map((x) => x.t), from, to);
      chunk.forEach((x, k) => {
        out[x.i] = (translated[k] && String(translated[k])) || x.t;
      });
    } catch {
      // пакет не прошёл — пробуем каждый текст отдельно, медленно но надёжно
      for (const x of chunk) {
        try {
          out[x.i] = (await gtxOne(x.t, from, to)) || x.t;
        } catch {
          out[x.i] = x.t; // не перевёлся — оставляем оригинал, сайт не ломаем
        }
      }
    }
  }
  return out;
}

// ─── LibreTranslate ───────────────────────────────────────────────
async function viaLibre(texts, from, to) {
  const res = await fetch(`${TRANSLATE.libreUrl}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: texts,
      source: from,
      target: to,
      format: "text",
      ...(TRANSLATE.apiKey ? { api_key: TRANSLATE.apiKey } : {}),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const out = json.translatedText;
  return Array.isArray(out) ? out : texts.map(() => out);
}

// ─── Google Cloud Translation ─────────────────────────────────────
async function viaGoogle(texts, from, to) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${TRANSLATE.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source: from, target: to, format: "text" }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data.translations.map((t) => t.translatedText);
}

// ─── DeepL ────────────────────────────────────────────────────────
async function viaDeepL(texts, from, to) {
  const target = DEEPL_CODES[to];
  const source = DEEPL_CODES[from];
  if (!target) throw new Error(`язык ${to} не поддерживается DeepL`);

  const url = TRANSLATE.apiKey?.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${TRANSLATE.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts, target_lang: target, ...(source ? { source_lang: source } : {}) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.translations.map((t) => t.text);
}

/** Работает ли автоматический перевод (для подсказки в админ-панели) */
export function translationEnabled() {
  return TRANSLATE.provider !== "none";
}
