# Структура проекта OLAN HIGH TECH

Быстрый путеводитель: что где лежит и что править.

## Где какие файлы

```
src/
├── main.tsx                  # Точка входа (не трогать)
├── styles/
│   ├── globals.css           # ⭐ ДИЗАЙН: цвета обеих тем, скругления,
│   │                         #   HUD-уголки, анимации радара и ленты
│   ├── fonts.css             # Подключение шрифтов Google Fonts
│   └── index.css             # Сборка всех стилей
│
└── app/
    ├── App.tsx               # Корень: страница + тема + навигация
    ├── types.ts              # Типы: Page, NavigateFn, SolutionContent
    │
    ├── data/                 # ⭐ ВСЕ ТЕКСТЫ САЙТА — правьте здесь
    │   ├── problems.ts       #   8 карточек проблем на главной
    │   ├── solutions.ts      #   Полный контент 8 страниц решений
    │   │                     #   (заголовки, продающие тексты, ТТХ, CTA)
    │   └── company.ts        #   Цифры, этапы, лента фиксаций, страны
    │                         #   СНГ, партнёры, проекты-кейсы
    │
    ├── components/
    │   ├── ui/               # Мелкие переиспользуемые элементы
    │   │   ├── Buttons.tsx        # PrimaryButton, GhostButton
    │   │   ├── Eyebrow.tsx        # Надстрочник секций
    │   │   └── ContactForm.tsx    # Форма заявки (подключать бэкенд тут)
    │   ├── console/          # Фирменная консоль мониторинга (хиро)
    │   │   ├── RadarScope.tsx     # Анимированный радар
    │   │   ├── LiveFeed.tsx       # Живая лента фиксаций
    │   │   └── MonitoringConsole.tsx
    │   ├── map/
    │   │   └── WorldMap.tsx       # Карта мира с подсветкой СНГ
    │   ├── layout/
    │   │   ├── Header.tsx         # Шапка: меню, тема, «Запросить КП»
    │   │   └── Footer.tsx         # Подвал
    │   └── solution/         # Части страницы решения
    │       ├── Breadcrumbs.tsx    # Хлебные крошки
    │       └── SpecPanel.tsx      # Тёмный «Технический паспорт»
    │
    └── pages/
        ├── HomePage.tsx      # Главная (9 секций)
        └── SolutionPage.tsx  # Универсальная страница решения (7 секций)
```

## Имена классов секций (для поиска в коде и инспекторе браузера)

Главная (`pages/HomePage.tsx`):

| Класс           | Секция                                    |
|-----------------|-------------------------------------------|
| .oht-hero       | Хиро с консолью мониторинга               |
| .oht-problems   | Сетка 8 проблем (якорь #problems)         |
| .oht-trust-bar  | Полоса цифр доверия                       |
| .oht-clients    | Гос-заказы / частные / международные      |
| .oht-geography  | Карта мира (якорь #geography)             |
| .oht-projects   | Кейсы (якорь #projects)                   |
| .oht-partners   | Партнёры (якорь #partners)                |
| .oht-certs      | Сертификаты (якорь #certs)                |
| .oht-contact    | Форма заявки (якорь #contact)             |

Страница решения (`pages/SolutionPage.tsx`):

| Класс              | Секция                                  |
|--------------------|------------------------------------------|
| .sol-hero          | Заголовок-боль + подводка               |
| .sol-problem-stats | 3 факта о проблеме                      |
| .sol-solution      | Продукт, текст, преимущества, паспорт   |
| .sol-process       | 4 этапа внедрения                       |
| .sol-results       | 4 результата                            |
| .sol-cta           | Призыв + форма                          |
| .sol-related       | Смежные решения                         |

## Частые задачи

- Поменять текст на странице решения → `data/solutions.ts`
- Добавить/убрать проблему → `data/problems.ts` + тип Page в `types.ts` + контент в `data/solutions.ts`
- Поменять цвета темы → `styles/globals.css` (блоки :root и [data-theme="light"])
- Заменить контакты → `components/layout/Header.tsx` и `Footer.tsx`
- Добавить проект-кейс → `data/company.ts` (массив projects) и маркер на карту (projectMarkers)
- Подключить отправку формы на сервер → `components/ui/ContactForm.tsx` (onSubmit)

## Запуск

```
npm install
npm run dev      # разработка
npm run build    # продакшен-сборка в dist/
```
