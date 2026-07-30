# Установка на свой сервер и домен

Пошаговая инструкция. Два способа на выбор:
**через Docker** (проще, рекомендуется) или **вручную** через PM2 и nginx.

---

## Что нужно перед началом

* Сервер с Ubuntu 22.04 или новее (подойдёт VPS от 2 ГБ оперативной памяти)
* Свой домен
* Доступ к серверу по SSH

---

## Шаг 1. Настроить домены

В панели управления доменом создайте пять записей типа **A**,
все указывают на IP вашего сервера:

| Запись | Куда указывает | Для чего |
|--------|----------------|----------|
| `olanhightech.com` | IP сервера | Главный сайт |
| `www` | IP сервера | То же самое с www |
| `portal` | IP сервера | Кабинеты операторов и менеджеров |
| `admin` | IP сервера | Админ-панель |
| `api` | IP сервера | Сервер и онлайн-чат |

Проверить, что записи разошлись (обычно 5–30 минут):

```bash
ping olanhightech.com
ping api.olanhightech.com
```

---

## Шаг 2. Подготовить сервер

```bash
# подключиться к серверу
ssh root@ВАШ_IP

# установить Docker
curl -fsSL https://get.docker.com | sh

# открыть порты для сайта
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
```

---

## Шаг 3. Загрузить платформу на сервер

Со своего компьютера:

```bash
scp OLAN-PLATFORM-full.zip root@ВАШ_IP:/opt/
```

На сервере:

```bash
cd /opt
unzip OLAN-PLATFORM-full.zip
cd olan-platform
```

---

## Шаг 4. Вписать свой домен и пароли

```bash
cp .env.example .env
nano .env
```

Обязательно поменяйте:

```bash
DOMAIN=вашдомен.com
PORTAL_DOMAIN=portal.вашдомен.com
ADMIN_DOMAIN=admin.вашдомен.com
API_DOMAIN=api.вашдомен.com
VITE_API_URL=https://api.вашдомен.com
CERTBOT_EMAIL=ваша@почта.com

ADMIN_EMAIL=admin@вашдомен.com
ADMIN_PASSWORD=ПридумайтеСложныйПароль

# сгенерировать ключ командой:  openssl rand -hex 32
JWT_SECRET=вставьте_сюда_результат_команды

ALLOWED_ORIGINS=https://вашдомен.com,https://www.вашдомен.com,https://portal.вашдомен.com,https://admin.вашдомен.com
```

Сохранить: `Ctrl+O`, `Enter`, затем `Ctrl+X`.

---

## Шаг 5. Запустить

```bash
docker compose up -d --build
```

Первая сборка занимает 3–5 минут. Проверить, что всё поднялось:

```bash
docker compose ps
```

Все службы должны быть в состоянии `Up`.

---

## Шаг 6. Включить HTTPS (бесплатный сертификат)

```bash
./deploy/ssl-setup.sh
```

Скрипт сам выпустит сертификаты на все пять доменов и перезапустит nginx.
Продлеваться они будут автоматически.

**Готово!** Открывайте:

* `https://вашдомен.com` — главный сайт
* `https://portal.вашдомен.com` — кабинеты сотрудников
* `https://admin.вашдомен.com` — админ-панель

---

## Шаг 7. Первая настройка

1. Войдите в админ-панель логином и паролем из `.env`
2. «Менеджеры и операторы» → добавьте менеджера
3. Раскройте его карточку → «Оператор» → добавьте операторов
4. «Редактор сайта» → поменяйте телефон, адрес, добавьте партнёров и проекты

---

## Обслуживание

```bash
# посмотреть, что происходит
docker compose logs -f server

# перезапустить
docker compose restart

# обновить после изменений в коде
./deploy/update.sh

# сделать резервную копию прямо сейчас
./deploy/backup.sh
```

**Автоматические копии каждую ночь** — добавьте в расписание:

```bash
crontab -e
# вписать строку:
0 3 * * * /opt/olan-platform/deploy/backup.sh
```

Все данные (тексты сайта, сотрудники, переписка, логотипы) хранятся
в папке `data/` — она переживает перезапуски и обновления.

---

## Автоматический перевод сайта (по желанию)

По умолчанию правки расходятся по всем 9 языкам **копированием** —
переводы вы правите вручную в админ-панели.

Чтобы тексты переводились сами, выберите один из вариантов в `.env`:

### Бесплатно, на своём сервере

Раскомментируйте службу `libretranslate` в `docker-compose.yml`, затем:

```bash
TRANSLATE_PROVIDER=libre
LIBRETRANSLATE_URL=http://libretranslate:5000
```

Качество среднее, но бесплатно и никуда не уходят ваши тексты.

### DeepL — лучшее качество

```bash
TRANSLATE_PROVIDER=deepl
TRANSLATE_API_KEY=ваш-ключ:fx
```

Отлично переводит на английский, немецкий, китайский, украинский, арабский.
Узбекский, казахский и белорусский DeepL не умеет — для них текст скопируется.

### Google Translate — все языки

```bash
TRANSLATE_PROVIDER=google
TRANSLATE_API_KEY=ваш-ключ
```

Поддерживает все 9 языков платформы.

После изменения `.env`:

```bash
docker compose up -d server
```

Затем в админ-панели нажмите «Перевести всё заново».

---

## Установка без Docker (PM2 + системный nginx)

Если предпочитаете классический способ:

```bash
# 1. Установить Node.js 20 и PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2

# 2. Запустить сервер
cd /opt/olan-platform/server
npm install --omit=dev
cd ..
nano ecosystem.config.cjs      # вписать пароли и домены
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# 3. Собрать три сайта
for app in site-client portal-staff admin-panel; do
  cd /opt/olan-platform/$app
  npm install
  VITE_API_URL=https://api.вашдомен.com npm run build
done

# 4. Разложить готовые файлы
mkdir -p /var/www/olan/{site,portal,admin}
cp -r /opt/olan-platform/site-client/dist/*   /var/www/olan/site/
cp -r /opt/olan-platform/portal-staff/dist/*  /var/www/olan/portal/
cp -r /opt/olan-platform/admin-panel/dist/*   /var/www/olan/admin/

# 5. Настроить nginx
cp /opt/olan-platform/deploy/nginx-standalone.conf /etc/nginx/sites-available/olan
nano /etc/nginx/sites-available/olan     # заменить домен на свой
ln -s /etc/nginx/sites-available/olan /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 6. Выпустить сертификаты
certbot --nginx -d вашдомен.com -d www.вашдомен.com \
  -d portal.вашдомен.com -d admin.вашдомен.com -d api.вашдомен.com
```

---

## Если что-то не работает

**Сайт открывается, но чат не подключается.**
Проверьте, что `VITE_API_URL` в `.env` совпадает с `API_DOMAIN`,
и что домен `api.вашдомен.com` открывается по HTTPS.
После изменения `VITE_API_URL` нужна пересборка: `docker compose up -d --build`.

**Уведомления браузера не приходят.**
Они работают только по HTTPS. Убедитесь, что сертификаты выпущены (шаг 6)
и вы заходите по `https://`, а не `http://`.

**Сертификат не выпускается.**
Скорее всего, DNS-записи ещё не разошлись. Проверьте `ping api.вашдомен.com` —
должен отвечать IP вашего сервера. Подождите и повторите `./deploy/ssl-setup.sh`.

**Ошибка «Источник не разрешён» в консоли браузера.**
Домен не вписан в `ALLOWED_ORIGINS` в `.env`. Добавьте и перезапустите:
`docker compose up -d server`.

**Забыли пароль администратора.**
Поменяйте `ADMIN_PASSWORD` в `.env` и выполните `docker compose up -d server`.
Данные при этом не теряются.

---

## Безопасность: что сделать обязательно

- [ ] Сменить `ADMIN_PASSWORD` на сложный пароль
- [ ] Сгенерировать `JWT_SECRET` командой `openssl rand -hex 32`
- [ ] Включить HTTPS (шаг 6)
- [ ] Настроить ночные резервные копии (crontab)
- [ ] Ограничить доступ к админ-панели по IP офиса —
      раскомментировать строки `allow`/`deny` в `deploy/nginx/olan.conf.template`
- [ ] Настроить вход на сервер по SSH-ключу, отключить вход по паролю
