// ══════════════════════════════════════════════════════════════════
// СЛУЖБА ПЕРЕВОДА
//
// Когда администратор меняет текст на одном языке, изменение
// расходится по всем языкам сайта. Как именно переводить —
// зависит от поставщика (настраивается в config.js):
//
//   "claude"  — ⭐ СМЫСЛОВОЙ ПЕРЕВОД (рекомендуется).
//               Переводит не слова по отдельности, а мысль целиком:
//               видит, что это сайт про системы контроля дорожного
//               движения, знает отраслевые термины, понимает, где
//               заголовок, а где строка техпаспорта, и подбирает
//               формулировку под каждый язык.
//               Нужен ключ ANTHROPIC_API_KEY.
//
//   "google-free" — бесплатный переводчик Google без ключа.
//               Переводит дословно, но работает сразу.
//               Используется как запасной, если "claude" недоступен.
//
//   "none"    — без перевода, текст копируется на все языки.
//   "libre"   — LibreTranslate (можно поднять у себя).
//   "google"  — Google Cloud Translation (нужен ключ).
//   "deepl"   — DeepL (нужен ключ).
//
// В ЛЮБОМ поставщике перед переводом прячутся названия приборов,
// аббревиатуры и единицы измерения (см. glossary.js), чтобы
// «W Space-S» не превратился в «В Космос-С», а «IP68» — в «ИП68».
//
// Если поставщик не отвечает — служба не ломает сохранение,
// а откатывается на запасной переводчик или копирует исходный текст.
// ══════════════════════════════════════════════════════════════════

import { TRANSLATE } from "./config.js";
import { protect, restore, glossaryHint, LANG_INFO } from "./glossary.js";

/** Коды языков для DeepL (у него свои обозначения) */
const DEEPL_CODES = {
  ru: "RU", en: "EN", zh: "ZH", ar: "AR",
  uz: null, // DeepL не знает узбекский — для него сработает запасной переводчик
};

// ─── Проверка полноты перевода ────────────────────────────────────
// Бесплатные переводчики иногда молча возвращают исходный текст:
// сработало ограничение по частоте запросов, оборвалась связь,
// пришёл ответ неожиданного формата. Раньше такие строки просто
// оставались на русском — отсюда и «переводит не везде».
// Теперь мы это ловим и переводим повторно.

/** Языки, которые пишутся кириллицей (для них проверка не годится) */
const CYRILLIC_LANGS = new Set(["ru", "uk", "be", "bg", "sr", "kk", "ky", "mk", "mn", "tg"]);

const hasCyrillic = (s) => /[А-Яа-яЁё]/.test(s);

/**
 * Строка осталась непереведённой?
 * Признак простой: в исходнике был русский текст, и в переводе он
 * остался — хотя целевой язык кириллицей не пишется.
 */
function looksUntranslated(source, result, to) {
  if (CYRILLIC_LANGS.has(to)) return false;      // проверка неприменима
  if (!source || !result) return true;
  if (!hasCyrillic(source)) return false;        // переводить было нечего
  return hasCyrillic(result);
}

/** Небольшая пауза между запросами, чтобы не поймать ограничение */
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Кэш переводов ────────────────────────────────────────────────
// Один и тот же текст на одном языке переводится один раз за запуск
// сервера. Экономит и время, и лимиты API.
const cache = new Map();
const cacheKey = (text, from, to, kind) => `${from}>${to}|${kind || ""}|${text}`;

/**
 * Перевести список строк.
 *
 * @param {string[]} texts — что переводить
 * @param {string} from    — исходный язык
 * @param {string} to      — целевой язык
 * @param {string[]} [kinds] — подсказка, что это за строка
 *        ("заголовок", "параметр техпаспорта", …). Нужна смысловому
 *        переводчику, чтобы выбрать верный стиль и длину.
 * @returns {Promise<string[]>} массив той же длины
 */
export async function translateBatch(texts, from, to, kinds = []) {
  if (!texts.length || from === to) return texts;

  const provider = resolveProvider();
  if (provider === "none") return texts;

  // 1. Отдаём из кэша всё, что уже переводили
  const out = new Array(texts.length);
  const todo = [];
  texts.forEach((text, i) => {
    const key = cacheKey(text, from, to, kinds[i]);
    if (cache.has(key)) out[i] = cache.get(key);
    else todo.push({ i, text, kind: kinds[i] });
  });
  if (!todo.length) return out;

  // 2. Прячем непереводимые термины
  const masked = todo.map(({ text }) => protect(text));

  // 3. Переводим ЦЕПОЧКОЙ переводчиков.
  //    Каждый следующий получает только те строки, которые предыдущий
  //    не осилил. Так одна недоступная служба больше не оставляет
  //    половину сайта на русском.
  const chain = providerChain(provider);
  let results = new Array(todo.length).fill(null);

  /** Индексы строк, которые ещё не переведены */
  const pending = () =>
    todo.map((_, k) => k).filter((k) => {
      const raw = results[k];
      const value = raw ? restore(raw, masked[k].map) : null;
      return !value || looksUntranslated(todo[k].text, value, to);
    });

  for (const current of chain) {
    let left = pending();
    if (!left.length) break;

    // На каждом переводчике — до трёх заходов: сначала крупными
    // порциями (быстро), потом мелкими (надёжнее при ограничениях).
    for (let round = 0; round < 3 && left.length; round++) {
      const size = round === 0 ? left.length : round === 1 ? 8 : 2;
      let anySuccess = false;
      let deadChunks = 0;

      for (let i = 0; i < left.length; i += size) {
        const slice = left.slice(i, i + size);
        let progressed = false;

        try {
          const got = await runProvider(
            current,
            slice.map((k) => masked[k].masked),
            from,
            to,
            slice.map((k) => todo[k].kind)
          );
          slice.forEach((k, j) => {
            const raw = got?.[j];
            if (!raw) return;
            const value = restore(String(raw), masked[k].map);
            if (value && !looksUntranslated(todo[k].text, value, to)) {
              results[k] = String(raw);
              progressed = true;
            }
          });
        } catch (err) {
          if (round === 0 && i === 0) {
            console.warn(`[перевод] ${current} ${from}→${to}: ${err.message}`);
          }
          // Дневной лимит или отказ службы — к следующему переводчику
          if (/лимит/i.test(err.message)) { deadChunks = 99; break; }
        }

        if (progressed) { deadChunks = 0; anySuccess = true; usedProviders.add(current); }
        // Три пустые порции подряд — служба недоступна, не тратим время
        else if (++deadChunks >= 3) break;

        await pause(200);
      }

      left = pending();
      if (!anySuccess) break;          // заход не дал ничего — следующий тоже не даст
      if (left.length) await pause(900); // пауза перед мелкими порциями
    }

    const still = pending();
    if (still.length && chain.indexOf(current) < chain.length - 1) {
      const next = chain[chain.indexOf(current) + 1];
      console.warn(`[перевод] ${from}→${to}: ${still.length} строк не прошли через ${current}, пробуем ${next}`);
    }
  }

  const notDone = pending().length;
  if (notDone) {
    console.warn(
      `[перевод] ${from}→${to}: ${notDone} из ${todo.length} строк остались непереведёнными. ` +
      `Все переводчики недоступны — проверьте интернет на сервере или задайте ANTHROPIC_API_KEY.`
    );
  }

  // 5. Возвращаем термины на место и складываем в кэш
  todo.forEach((item, k) => {
    const raw = results[k];
    const value = raw ? restore(raw, masked[k].map) : item.text;
    out[item.i] = value || item.text;
    // в кэш кладём только удавшийся перевод, чтобы неудача
    // не «залипла» до перезапуска сервера
    if (!looksUntranslated(item.text, out[item.i], to)) {
      cache.set(cacheKey(item.text, from, to, item.kind), out[item.i]);
    }
  });

  return out;
}

/** Сколько строк осталось непереведёнными (для отчёта админу) */
export function countFailures(sources, results, to) {
  let n = 0;
  sources.forEach((src, i) => {
    if (looksUntranslated(src, results[i], to)) n++;
  });
  return n;
}

export { looksUntranslated };

/** Какой поставщик реально используется */
function resolveProvider() {
  const p = TRANSLATE.provider;
  // Ключ Anthropic задан, а поставщик остался по умолчанию —
  // включаем смысловой перевод автоматически.
  if (p === "google-free" && TRANSLATE.anthropicKey) return "claude";
  // Выбран "claude", но ключа нет — молча работаем на бесплатном Google.
  if (p === "claude" && !TRANSLATE.anthropicKey) return "google-free";
  return p;
}

function runProvider(provider, texts, from, to, kinds) {
  if (provider === "claude") return viaClaude(texts, from, to, kinds);
  if (provider === "google-free") return viaGoogleFree(texts, from, to);
  if (provider === "mymemory") return viaMyMemory(texts, from, to);
  if (provider === "libre") return viaLibre(texts, from, to);
  if (provider === "google") return viaGoogle(texts, from, to);
  if (provider === "deepl") return viaDeepL(texts, from, to);
  throw new Error(`неизвестный поставщик перевода: ${provider}`);
}

/**
 * ЦЕПОЧКА ПЕРЕВОДЧИКОВ — главная защита от «переводит не везде».
 *
 * Раньше переводчик был один: если он не отвечал (нет интернета,
 * адрес сервера заблокирован, исчерпан лимит), строка молча
 * оставалась на русском. Теперь строки, которые не перевелись,
 * передаются следующему переводчику в цепочке.
 *
 * Порядок: сначала основной (самый качественный), затем запасные.
 */
function providerChain(main) {
  if (main === "none") return [];
  const chain = [main];
  // бесплатные запасные — добавляем, если они ещё не в цепочке
  for (const backup of ["google-free", "mymemory"]) {
    if (!chain.includes(backup)) chain.push(backup);
  }
  return chain;
}

/** Какие переводчики реально сработали — показываем администратору */
const usedProviders = new Set();
export function lastUsedProviders() {
  return [...usedProviders];
}

// ══════════════════════════════════════════════════════════════════
// СМЫСЛОВОЙ ПЕРЕВОД (Claude)
//
// Переводчику даётся полный контекст: чей это сайт, для кого,
// какие термины отрасли, какой язык и в каком стиле нужен результат,
// и что именно за строка переводится (заголовок / абзац / параметр).
// Благодаря этому получается грамотный текст, а не подстрочник.
// ══════════════════════════════════════════════════════════════════

function systemPrompt(from, to) {
  const src = LANG_INFO[from]?.name || from;
  const dst = LANG_INFO[to];
  const hint = glossaryHint(to);

  return `Ты — профессиональный переводчик технических и маркетинговых текстов.

КОНТЕКСТ
Ты переводишь сайт компании OLAN HIGH TECH PROJECT. Компания производит
и внедряет интеллектуальные системы контроля дорожного движения:
радарные комплексы измерения скорости, камеры фиксации проезда на красный
свет, контроль парковки, полос общественного транспорта, железнодорожных
переездов, ремней безопасности и телефона за рулём.
Заказчики — государственные органы (министерства, дорожные ведомства,
муниципалитеты) и частный бизнес (аэропорты, торговые центры, платные дороги).

ЗАДАЧА
Перевести с языка ${src} на ${dst?.name || to}.
Особенности целевого языка: ${dst?.note || "стандартная литературная норма"}.

ПРАВИЛА
1. Переводи СМЫСЛ, а не слова. Результат должен читаться так, будто текст
   изначально написан носителем языка для делового сайта.
2. Сохраняй деловой, уверенный тон. Это B2G/B2B-продажи, не реклама
   с восклицаниями и не сухая инструкция.
3. Метки вида ⟦0⟧, ⟦1⟧ — это названия приборов, аббревиатуры и единицы
   измерения. ПЕРЕНОСИ ИХ В ПЕРЕВОД БЕЗ ИЗМЕНЕНИЙ, ровно в таком же виде.
   Не переводи их, не меняй номер, не добавляй пробелы внутри меток.
   Ставь метку в то место фразы, где она уместна по грамматике языка.
4. Сохраняй числа, проценты и знаки препинания в цифрах.
5. Не добавляй ничего от себя и ничего не выбрасывай.
6. Заголовки оставляй короткими — примерно той же длины, что оригинал.
   Строки техпаспорта переводи предельно кратко, как в спецификации.
7. Если строка — имя собственное, код или уже на целевом языке,
   верни её без изменений.
${hint ? `\nОТРАСЛЕВЫЕ ТЕРМИНЫ (обязательно соблюдать):\n${hint}` : ""}

ФОРМАТ ОТВЕТА
Верни ТОЛЬКО массив JSON со строками перевода, в том же порядке и той же
длины, что и входной массив. Без пояснений, без markdown, без \`\`\`.
Пример ответа: ["первый перевод","второй перевод"]`;
}

async function claudeCall(items, from, to) {
  const url = "https://api.anthropic.com/v1/messages";
  const payload = {
    model: TRANSLATE.anthropicModel,
    max_tokens: 8000,
    system: systemPrompt(from, to),
    messages: [
      {
        role: "user",
        content:
          "Переведи эти строки. Для каждой указано, что это за элемент сайта — " +
          "учитывай это при выборе стиля и длины.\n\n" +
          JSON.stringify(
            items.map((x, i) => ({ i, kind: x.kind || "текст", text: x.text })),
            null,
            1
          ) +
          `\n\nОтветь массивом JSON из ${items.length} строк.`,
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TRANSLATE.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = (json.content || [])
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();

  // на случай, если ответ обёрнут в ```json
  const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const arr = JSON.parse(clean);
  if (!Array.isArray(arr)) throw new Error("ответ не является массивом");
  if (arr.length !== items.length) {
    throw new Error(`ожидалось ${items.length} строк, пришло ${arr.length}`);
  }
  return arr.map((x) => (typeof x === "string" ? x : String(x ?? "")));
}

async function viaClaude(texts, from, to, kinds = []) {
  const items = texts.map((text, i) => ({ text, kind: kinds[i] }));

  // Режем на порции: не больше 25 строк и ~4000 символов за запрос —
  // так перевод точнее и ответ гарантированно помещается целиком.
  const chunks = [];
  let cur = [];
  let size = 0;
  for (const item of items) {
    if (cur.length >= 25 || size + item.text.length > 4000) {
      chunks.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(item);
    size += item.text.length;
  }
  if (cur.length) chunks.push(cur);

  const out = [];
  for (const chunk of chunks) {
    let done = null;
    for (let attempt = 0; attempt < 2 && !done; attempt++) {
      try {
        done = await claudeCall(chunk, from, to);
      } catch (err) {
        if (attempt === 1) throw err;
        await new Promise((r) => setTimeout(r, 900));
      }
    }
    out.push(...done);
  }
  return out;
}

// ─── Google-переводчик без ключа ──────────────────────────────────
// Открытая точка translate.googleapis.com (client=gtx), ключ не нужен.

async function gtxOne(text, from, to, attempt = 0) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx" +
    `&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (res.status === 429 && attempt === 0) {
    await new Promise((r) => setTimeout(r, 1200));
    return gtxOne(text, from, to, 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json[0] || []).map((seg) => seg[0]).join("");
}

/** До 40 текстов за одно обращение — быстрее и без блокировок */
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
  const list = Array.isArray(json) ? json : [json];
  return list.map((item) => (Array.isArray(item) ? item[0] : item));
}

async function viaGoogleFree(texts, from, to) {
  const out = new Array(texts.length);

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
      for (const x of chunk) {
        try {
          out[x.i] = (await gtxOne(x.t, from, to)) || x.t;
        } catch {
          out[x.i] = x.t;
        }
      }
    }
  }
  return out;
}

// ─── MyMemory ─────────────────────────────────────────────────────
// Второй бесплатный переводчик, ключ не нужен.
//
// Зачем он: Google блокирует запросы с адресов дата-центров, поэтому
// на боевом хостинге (Render, Railway, VPS) бесплатный Google-переводчик
// часто молча не работает — и текст остаётся русским. MyMemory с таких
// адресов работает, поэтому служит запасным вариантом.
//
// Ограничение: примерно 5000 слов в сутки с одного адреса. Для правок
// содержимого этого достаточно; для перевода всего сайта целиком лучше
// задать ANTHROPIC_API_KEY и переводить смысловым переводчиком.

async function myMemoryOne(text, from, to) {
  const url =
    "https://api.mymemory.translated.net/get" +
    `?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const value = json?.responseData?.translatedText;
  if (!value) throw new Error("пустой ответ");
  // сервис возвращает предупреждения прямо в поле перевода
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(value)) throw new Error("исчерпан дневной лимит");
  return value;
}

async function viaMyMemory(texts, from, to) {
  const out = new Array(texts.length);
  // построчно, с паузой: сервис не принимает пакеты
  for (let i = 0; i < texts.length; i++) {
    try {
      out[i] = await myMemoryOne(texts[i], from, to);
    } catch (err) {
      out[i] = null;
      // дневной лимит — дальше пробовать бессмысленно
      if (/лимит/.test(err.message)) throw err;
    }
    await pause(120);
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
  return resolveProvider() !== "none";
}

/** Что показать администратору в панели */
export function translationInfo() {
  const provider = resolveProvider();
  const smart = provider === "claude";
  const chain = providerChain(provider);
  return {
    provider,
    chain,                       // порядок, в котором пробуются переводчики
    used: [...usedProviders],    // какие реально сработали с момента запуска
    enabled: provider !== "none",
    smart,
    label: smart
      ? "Смысловой перевод: учитывает отрасль, контекст и стиль. Если служба недоступна — включатся запасные."
      : provider === "none"
      ? "Перевод выключен — текст копируется на все языки без изменений."
      : "Дословный перевод (бесплатный, без ключа). Для грамотного перевода задайте ANTHROPIC_API_KEY на сервере.",
    hint:
      "Строки, которые не смог перевести один переводчик, автоматически " +
      "передаются следующему: " + chain.join(" → ") + ".",
  };
}
