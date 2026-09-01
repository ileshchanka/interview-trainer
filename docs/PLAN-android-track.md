# Второй трек: Android (Kotlin) рядом с существующим Web (JS/TS/Angular)

## Context

Тренажёр `~/projects/interview-trainer` сейчас знает ровно три темы — JavaScript, TypeScript
и Angular, — и это зашито в тип `Topic` и в загрузку контента. Нужен второй трек подготовки,
Android, с тем же набором возможностей (карточки с интервальным повторением, кодовые задачи,
статистика), и переключатель между треками в интерфейсе.

Одно ограничение определяет форму всей работы: **Kotlin в браузере исполнить нечем**.
Веб-трек по-настоящему запускает код в Web Worker и сверяет предсказание с фактическим
выводом; для Kotlin такой возможности нет ни локально, ни на GitHub Pages, и транспилятор
Kotlin→JS этой проблемы не решает (десятки мегабайт и всё равно без Android SDK).

Поэтому android-задачи устроены иначе и честно об этом говорят: редактор только для чтения,
кнопка называется «Показать ответ», а не «Проверить», вердикт сверяется с записанным в JSON
выводом. Чтобы записанный вывод не расходился с реальностью, `verify:content` получает ветку
для Kotlin: он компилирует и запускает каждую задачу через `kotlinc`. Это нужно ровно затем,
что на веб-корпусе три задачи из двадцати восьми были записаны неверно и нашлись только
исполнением. `kotlinc` — инструмент разработки: ни в бандл, ни на Pages он не попадает.

Решения, принятые до начала работы:
- темы android-трека: Kotlin, Android SDK, Compose, корутины и Flow;
- переключатель треков — выпадающий список в шапке, выбор запоминается;
- kotlinc ставится локально (`brew install kotlin`) и добавляется шагом в CI;
- прогресс не сбрасывается: он привязан к идентификаторам карточек, а те не меняются.

## Архитектура

### Трек как понятие предметной области

Новый чистый модуль `src/app/domain/tracks.ts` — рядом с `models.ts`, без Angular:

```ts
export type Track = 'web' | 'android';
export const TRACKS: readonly Track[] = ['web', 'android'];
export const TRACK_TITLES: Record<Track, string> = {
  web: 'Web · JS / TS / Angular',
  android: 'Android · Kotlin',
};
export const TOPICS_BY_TRACK: Record<Track, readonly Topic[]> = {
  web: ['js', 'ts', 'angular'],
  android: ['kotlin', 'android', 'compose', 'coroutines'],
};
export function trackOf(topic: Topic): Track;
```

`Topic` в `src/app/domain/models.ts` расширяется до семи значений, `TOPIC_TITLES` — тоже.
Плоский список `TOPICS` остаётся (он нужен статистике по всему корпусу), но экраны переходят
на `TOPICS_BY_TRACK[track]`.

`CodeTask.language` расширяется до `'js' | 'ts' | 'kotlin'`, и туда же добавляется
предикат `isRunnable(language)` — единственное место, где живёт знание «Kotlin не запускается».
Ни `task-page`, ни `verify-content` не должны сравнивать язык со строкой самостоятельно.

### Контент раскладывается по трекам

```
public/content/
  web/     js.json  ts.json  angular.json  tasks.json
  android/ kotlin.json  android.json  compose.json  coroutines.json  tasks.json
```

Существующие файлы переезжают в `web/` (`code-tasks.json` → `web/tasks.json`). Идентификаторы
карточек и задач при этом не меняются — накопленный прогресс переживает переезд.

`ContentService` (`src/app/core/content/content.service.ts`) грузит **только активный трек**:
`load()` читает текущий трек из `TrackService` и запрашивает файлы из `TOPICS_BY_TRACK`.
Так стартовая загрузка не растёт вдвое, а фильтрация по треку на экранах становится почти
бесплатной — в сервисе просто нет чужих карточек. Смену трека ловит эффект в конструкторе
сервиса, сравнивающий текущий трек с уже загруженным.

### Переключатель

`src/app/shared/track.service.ts` — по образцу существующего `ThemeService`: сигнал плюс
`localStorage` с той же защитой от приватного режима (запись и чтение в `try/catch`).

В шапке (`src/app/app.html`, `app.ts`) — кнопка с `mat-menu` слева от навигации.
При выборе трека сервис пишет новый трек и происходит переход на `/decks`: маршрут вида
`/review/js` в android-треке ведёт в пустую сессию, и оставлять человека на нём нельзя.

### Экраны

Изменения однотипны — вместо `TOPICS` берутся темы текущего трека:

- `features/decks/decks-page.ts` — колоды трека; заголовок экрана называет трек;
- `features/code/tasks-page.ts` — чипы фильтра по темам трека;
- `features/stats/stats-page.ts` — прогресс и слабые места по темам трека.

`features/review/review-page.ts` не трогаем: он строит сессию из `content.cards()`, а там
уже только активный трек.

### Экран задачи для неисполняемого языка

`features/code/task-page.ts` — единственное место с настоящей развилкой:

| | JS / TS | Kotlin |
|---|---|---|
| редактор | правится | `readOnly` |
| кнопка | «Проверить» | «Показать ответ» |
| источник истины | фактический вывод из воркера | `task.expectedOutput` |
| под редактором | — | пометка «код не исполняется в браузере» |

Сравнение в обоих случаях делает та же `domain/verdict.ts` — послабление по кавычкам
и пробелам внутри структур работает и для Kotlin (`[a, b]` против `[a,b]`). Попытка
записывается через `progress.recordAttempt` одинаково.

Подсветка Kotlin у Monaco уже есть: `monaco-editor/esm/vs/languages/definitions/kotlin`
подключается вместе с пакетом, дополнительных зависимостей не нужно.

### Проверка контента

`scripts/verify-content.mjs` получает ветку для Kotlin: код задачи оборачивается в `main`,
пишется во временный файл, компилируется `kotlinc -include-runtime` и запускается на JVM.
Вывод сверяется той же нормализацией, что и для JS. Если `kotlinc` не найден, скрипт
не падает, а печатает предупреждение с числом непроверенных задач — чтобы `npm run check`
оставался рабочим на машине без Kotlin.

Компиляция каждой задачи через `kotlinc` небыстрая (секунды на задачу), поэтому все задачи
собираются **одним** вызовом компилятора: по файлу с уникальным именем `main` на задачу.

## Контент

Ориентир — сопоставимо с веб-треком: около 150 карточек и 20 задач.

- **Kotlin (~45):** `val`/`var`, null-safety и платформенные типы, `?.`/`?:`/`!!`,
  data-классы и `copy`, sealed-классы и `when` с проверкой полноты, объекты и `companion`,
  extension-функции и их статическая диспетчеризация, `inline`/`reified`/`crossinline`,
  делегаты (`by lazy`, `observable`), scope-функции (`let`/`run`/`apply`/`also`/`with`),
  коллекции и последовательности, `equals`/`hashCode`, генерики и вариантность
  (`in`/`out`/`where`), исключения и отсутствие checked, интероп с Java.
- **Android SDK (~40):** жизненный цикл Activity и Fragment, пересоздание при повороте
  и `SavedStateHandle`, задачи и режимы запуска, Intent и явные/неявные,
  Service vs Foreground Service, WorkManager, разрешения в рантайме, `Context`
  и его разновидности, утечки через контекст, ANR и главный поток, ViewBinding,
  RecyclerView и DiffUtil, Room, DataStore против SharedPreferences, ProGuard/R8.
- **Compose (~35):** декларативность и рекомпозиция, `remember` и `rememberSaveable`,
  `mutableStateOf` и стабильность, `derivedStateOf`, `LaunchedEffect`/`DisposableEffect`/
  `SideEffect`/`rememberCoroutineScope`, state hoisting, `CompositionLocal`,
  модификаторы и порядок их применения, фазы (composition/layout/drawing),
  `LazyColumn` и ключи, навигация, темы и Material 3, интероп с View, тестирование.
- **Корутины и Flow (~30):** `suspend` и продолжения, структурированный параллелизм,
  `launch` против `async`, скоупы и `viewModelScope`, `Job` и отмена, кооперативность
  отмены и `ensureActive`, `withContext` и диспетчеры, `CoroutineExceptionHandler`
  и `SupervisorJob`, `Flow` холодный против `StateFlow`/`SharedFlow`,
  `collectLatest`, `flowOn`, `buffer`/`conflate`, `combine`/`zip`,
  `repeatOnLifecycle` и утечки подписок.
- **Задачи (~20):** порядок вывода `launch`/`async`/`runBlocking`, отмена и `finally`,
  `withContext` и переключение потоков, `SupervisorJob` против обычного, `StateFlow`
  и пропуск значений, `collectLatest` против `collect`, extension-функция против метода
  при статической диспетчеризации, `data class` и `copy` с изменяемым полем, `by lazy`
  и порядок инициализации, `equals` у data-класса с массивом, scope-функции и возвращаемое
  значение, `let` на nullable, платформенные типы из Java, `inline` и нелокальный `return`.

## Ключевые файлы

Новое:
- `src/app/domain/tracks.ts` и `tracks.spec.ts` — треки и их темы;
- `src/app/shared/track.service.ts` — выбранный трек с сохранением;
- `public/content/android/*.json` — корпус.

Правится:
- `src/app/domain/models.ts` — расширение `Topic`, `TOPIC_TITLES`, `CodeTask.language`,
  предикат `isRunnable`;
- `src/app/core/content/content.service.ts` — загрузка по треку;
- `src/app/app.html`, `src/app/app.ts` — переключатель в шапке;
- `src/app/features/{decks,code,stats}/*` — темы текущего трека, режим «без исполнения»;
- `scripts/verify-content.mjs` — ветка Kotlin;
- `.github/workflows/deploy.yml` — установка Kotlin перед проверкой;
- `README.md` — второй трек и его ограничение.

## Проверка

```bash
brew install kotlin        # разово, для проверки корпуса
cd ~/projects/interview-trainer
npm run verify:content     # структура + исполнение JS/TS в Node и Kotlin через kotlinc
npm test                   # юнит-тесты, включая новые по трекам
npm run build
npm start
```

Ручной сценарий целиком:

1. Открыть приложение — в шапке виден текущий трек, по умолчанию Web, экран колод прежний.
2. Переключить трек на Android — экран колод показывает четыре андроид-колоды,
   происходит переход на `/decks`, счётчики новых карточек ненулевые.
3. Перезагрузить страницу — выбранный трек сохранился.
4. Пройти несколько карточек в android-треке; вернуться на Web — прогресс веб-трека на месте
   и не смешался с андроидом.
5. Открыть Kotlin-задачу: редактор не редактируется, под ним пометка про отсутствие
   исполнения, кнопка называется «Показать ответ»; неверное предсказание показывает
   расхождение, верное — засчитывается, разбор открывается после ответа.
6. Открыть JS-задачу веб-трека — исполнение в воркере и таймаут на `while (true) {}`
   работают как раньше.
7. Экран прогресса в каждом треке показывает только его темы.
