# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Язык

Проект целиком на русском: комментарии, коммиты, тексты интерфейса, документация.
Новый код пишется так же. Комментарии здесь объясняют **почему**, а не **что** —
держите этот стиль, он выдержан по всему репозиторию.

## Команды

```bash
npm start                 # dev-сервер, http://localhost:4200
npm run check             # полный прогон: контент + тесты + сборка (то же, что в CI)
npm run verify:content    # структура корпуса + фактическое исполнение всех кодовых задач
npm test                  # ng test (vitest, jsdom); в TTY — watch-режим
npx ng test --watch=false # одиночный прогон
npx ng test --watch=false --include src/app/domain/srs.spec.ts   # один файл
npx ng test --watch=false --filter "SM-2"                        # по имени теста/сюиты
npm run build             # прод-сборка + postbuild (404.html для SPA-fallback)
```

Линтера нет. Форматирование — Prettier (`printWidth: 100`, одинарные кавычки,
для `*.html` парсер `angular`).

`verify:content` исполняет JS/TS в изолированном контексте Node, а Kotlin — настоящим
`kotlinc` (`brew install kotlin`). Без kotlinc скрипт не падает, а предупреждает,
сколько задач осталось непроверенными; в CI kotlinc ставится, поэтому там проверяется всё.
Библиотека корутин кэшируется в `node_modules/.cache/kotlin`.

## Архитектура

Angular 22: standalone-компоненты, signals, **zoneless** change detection, ленивые маршруты,
TypeScript strict. Бэкенда нет: контент — статические JSON, прогресс — IndexedDB.

Слои (`src/app/`):

- **`domain/`** — чистый TypeScript без Angular, DOM и сети: `srs.ts` (SM-2), `session.ts`
  (сборка очереди повторения), `verdict.ts` (сравнение вывода кода), `stats.ts`, `tracks.ts`,
  `models.ts`. Полностью покрыт юнит-тестами на синтетических данных.
  **Вся логика повторений и проверки ответов должна оставаться здесь**; Angular-слой
  только рисует результат. Новые тесты пишите на domain-модуль, а не на компонент.
- **`core/`** — `ContentService` (загрузка JSON текущего трека в сигналы) и `ProgressStore`
  (сигналы поверх `ProgressStorage`, внедряемого через токен `PROGRESS_STORAGE`;
  реализация — `IndexedDbStorage`, в тестах подменяется фейком).
- **`features/`** — экраны: `decks`, `review`, `browse`, `code`, `stats`.
- **`shared/`** — обёртка Monaco, markdown-pipe, `ThemeService`, `TrackService`, гварды треков.

### Треки

`web` (js, ts, angular) и `android` (kotlin, android, compose, coroutines). Состав задан
**один раз** в `src/app/domain/tracks.ts`; `ContentService` держит в памяти всегда ровно
один трек, поэтому фильтрация по треку на экранах получается сама собой — чужих карточек
просто нет. Из этого следует важное: прямая ссылка вроде `/browse/kotlin` при активном
веб-треке показала бы пустую колоду, поэтому маршруты с темой и задачей защищены гвардами
`syncTrackGuard` / `syncTrackForTaskGuard` (`shared/track.guard.ts`), которые переключают
трек и **дожидаются** загрузки контента.

Добавление темы затрагивает три места: `src/app/domain/tracks.ts`, таблицу `TRACKS`
внутри `scripts/verify-content.mjs` и новый файл `public/content/<трек>/<тема>.json`.

### Исполнение кода задач

`isRunnable()` в `domain/models.ts` — единственное место, где живёт знание «Kotlin
в браузере не выполняется». Не сравнивайте язык со строкой в других местах.

Исполняемый код (JS/TS) уходит в **Web Worker** с таймаутом 3 с: `while (true) {}` —
типичная ошибка в задачах про event loop, и на главном потоке она вешала бы вкладку;
по таймауту воркер убивается `terminate()`. TypeScript транспилируется самим Monaco
(компилятор приезжает вместе с редактором), второй экземпляр `typescript` в рантайм
не тащим. Для Kotlin единственный источник вердикта — `expectedOutput` в JSON, и его
правдивость обеспечивает только `verify:content`.

### Контент

`public/content/<трек>/*.json`. **Идентификаторы карточек и задач стабильны и не меняются** —
по ним привязан накопленный в IndexedDB прогресс; переформулировать вопрос можно,
менять `id` нельзя. После правки корпуса — `npm run verify:content`.

### Деплой

GitHub Pages через `.github/workflows/deploy.yml`. Сборка идёт как
`npm run build -- --base-href /interview-trainer/`: именно `npm run build`, а не `npx ng build`,
иначе не отработает `postbuild` (`scripts/spa-fallback.mjs`), кладущий рядом `404.html` —
без него обновление страницы на любом маршруте, кроме корневого, даёт «File not found».
