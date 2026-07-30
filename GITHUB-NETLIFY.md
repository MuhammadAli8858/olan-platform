# Шаг 1: GitHub → Шаг 2: Netlify

Правильный порядок: сначала выкладываем проект на GitHub, потом
подключаем его к Netlify. Дальше любое изменение в GitHub будет
автоматически обновлять сайты.

---

## ЧАСТЬ 1. Выложить проект на GitHub

### 1.1 Что НЕ попадёт в репозиторий

Файл `.gitignore` уже настроен и защищает:

| Не публикуется | Почему |
|---|---|
| `.env` | В нём пароли и секретный ключ |
| `server/data/` | База: сотрудники, переписка с клиентами, заявки |
| `server/uploads/` | Загруженные логотипы партнёров |
| `node_modules/` | Библиотеки, Netlify скачает их сам |
| `dist/` | Готовые сборки, Netlify собирает заново |

⚠️ **Важно:** файл `server/src/config.js` публикуется, а в нём стоит
пароль администратора по умолчанию. Если репозиторий **публичный** —
обязательно поменяйте пароль на сервере через `.env` (переменная
`ADMIN_PASSWORD` перекрывает значение из кода).

### 1.2 Установить Git (если ещё нет)

* Windows: скачайте с [git-scm.com](https://git-scm.com), установите с настройками по умолчанию
* Проверка: откройте терминал и введите `git --version`

Один раз укажите, кто вы:

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "ваша@почта.com"
```

### 1.3 Создать репозиторий на GitHub

1. Зайдите на [github.com](https://github.com) → войдите или зарегистрируйтесь
2. Нажмите **+** (справа вверху) → **New repository**
3. Заполните:
   * **Repository name:** `olan-platform`
   * **Private** — если не хотите, чтобы код видели посторонние
     (Netlify работает и с приватными репозиториями)
   * ❌ НЕ ставьте галочки «Add README», «Add .gitignore» —
     они уже есть в проекте
4. **Create repository**

GitHub покажет адрес вида `https://github.com/ваш-логин/olan-platform.git` —
он понадобится дальше.

### 1.4 Загрузить проект

Откройте терминал в папке `olan-platform` (в VS Code: `Ctrl+~`)
и выполните команды **по одной**:

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "Платформа OLAN HIGH TECH: сайт, кабинеты, админ-панель"
```
```bash
git branch -M main
```
```bash
git remote add origin https://github.com/ваш-логин/olan-platform.git
```
```bash
git push -u origin main
```

При первом `push` GitHub попросит войти — откроется окно браузера,
подтвердите вход. Если вместо этого просят пароль в терминале,
нужен **токен**: GitHub → Settings → Developer settings →
Personal access tokens → Tokens (classic) → Generate new token →
поставьте галочку `repo` → скопируйте токен и вставьте вместо пароля.

### 1.5 Проверка

Обновите страницу репозитория на GitHub — должны появиться папки
`server`, `site-client`, `portal-staff`, `admin-panel` и файлы
`README.md`, `DEPLOY.md`.

Убедитесь, что папки `server/data` там **нет** — это значит, база
с паролями осталась только у вас.

### 1.6 Как отправлять изменения дальше

Каждый раз, когда что-то поменяли в коде:

```bash
git add .
```
```bash
git commit -m "Коротко что изменили"
```
```bash
git push
```

После `push` Netlify сам пересоберёт сайты (через 1–2 минуты).

---

## ЧАСТЬ 2. Подключить Netlify к GitHub

Напоминание: на Netlify живут **только три сайта**. Сервер с чатом
ставится на ваш VPS — см. `DEPLOY.md`. Почему так — в `NETLIFY.md`.

### 2.1 Сначала поднимите сервер

Netlify-сайтам нужен адрес сервера, поэтому сервер должен работать
раньше. По `DEPLOY.md` поднимите его на домене вроде
`https://api.olanhightech.com` (с HTTPS — обязательно).

### 2.2 Создать первый сайт (главный)

1. Зайдите на [netlify.com](https://netlify.com) → войдите **через GitHub**
   (кнопка «Sign up with GitHub» — так Netlify сразу увидит репозитории)
2. **Add new site** → **Import an existing project**
3. **Deploy with GitHub** → разрешите доступ → выберите `olan-platform`
4. Откроется страница настроек. Заполните так:

   | Поле | Значение |
   |---|---|
   | **Branch to deploy** | `main` |
   | **Base directory** | `site-client` |
   | **Build command** | `npm install && npm run build` |
   | **Publish directory** | `site-client/dist` |

   Обычно Netlify подставляет это сам из файла `netlify.toml` —
   проверьте, что **Base directory** указан верно.

5. Нажмите **Add environment variables** → **New variable**:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://api.вашдомен.com` |

   ⚠️ Это самое важное поле. Без него сайт будет искать сервер
   на localhost, и чат не заработает.

6. **Deploy site**

Через 2–3 минуты сайт откроется по адресу вида
`случайное-имя.netlify.app`. Переименовать: **Site configuration →
Change site name** → например `olan-site`.

### 2.3 Создать второй и третий сайты

Повторите пункт 2.2 ещё два раза, **из того же репозитория**,
меняя только Base directory:

| Сайт | Base directory | Имя на Netlify |
|---|---|---|
| Кабинеты операторов и менеджеров | `portal-staff` | `olan-portal` |
| Админ-панель | `admin-panel` | `olan-admin` |

Переменную `VITE_API_URL` нужно добавить **в каждый** из трёх сайтов.

### 2.4 Подключить свой домен

Для каждого сайта: **Domain management** → **Add a domain**:

| Сайт Netlify | Домен |
|---|---|
| olan-site | `olanhightech.com` |
| olan-portal | `portal.olanhightech.com` |
| olan-admin | `admin.olanhightech.com` |

Netlify покажет, какую запись создать у регистратора домена —
обычно **CNAME** на `имя-сайта.netlify.app`. Для корневого домена
Netlify предложит либо свои DNS-серверы, либо запись **A** на его IP.

HTTPS-сертификат Netlify выпустит автоматически через несколько минут.

### 2.5 Разрешить сайтам обращаться к серверу

На **сервере** (не на Netlify) откройте `.env` и перечислите адреса
всех сайтов через запятую — и домены, и адреса `.netlify.app`:

```bash
ALLOWED_ORIGINS=https://olanhightech.com,https://www.olanhightech.com,https://portal.olanhightech.com,https://admin.olanhightech.com,https://olan-site.netlify.app,https://olan-portal.netlify.app,https://olan-admin.netlify.app
```

Перезапустите сервер:

```bash
docker compose up -d server
```

Без этого браузер заблокирует запросы к серверу.

### 2.6 Первая настройка после запуска

База данных в репозиторий не попадала, поэтому на сервере она пустая —
это правильно, тестовых учётных записей на рабочем сайте быть не должно.

1. Откройте `https://admin.вашдомен.com`
2. Войдите логином и паролем из `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
3. **Менеджеры и операторы** → добавьте менеджера
4. Раскройте его карточку → **Оператор** → добавьте операторов
5. **Редактор сайта** → впишите свои телефон, почту, адрес, партнёров

---

## Проверка, что всё связалось

| Что проверить | Как |
|---|---|
| Сайт открывается | `https://вашдомен.com` |
| Тексты идут с сервера | Поменяйте телефон в админке → обновите сайт |
| Чат работает | Напишите в чат → сообщение придёт оператору |
| Языки переводятся | Переключите язык в шапке |
| Уведомления | Разрешите их в браузере — Netlify отдаёт HTTPS |

---

## Если что-то не работает

**Сборка на Netlify упала.** Откройте **Deploys** → нажмите на неудачный
деплой → там весь журнал. Чаще всего: неверный **Base directory**
(должен быть `site-client`, а не `olan-platform/site-client`).

**Сайт открылся, но чат крутит «Соединение…».**
Проверьте на сайте `F12 → Console`. Если видите ошибку CORS —
добавьте адрес сайта в `ALLOWED_ORIGINS` на сервере (пункт 2.5).
Если ошибка «net::ERR» — сервер недоступен или без HTTPS.

**Сайт показывает встроенные русские тексты вместо своих.**
Не задана `VITE_API_URL`. Добавьте переменную и пересоберите:
**Deploys → Trigger deploy → Deploy site**.

**Поменял переменную, а ничего не изменилось.**
`VITE_API_URL` вшивается в момент сборки. После изменения переменной
нужен новый деплой: **Trigger deploy**.

**GitHub не принимает push: «Support for password authentication was removed».**
Нужен токен вместо пароля — см. пункт 1.4.
