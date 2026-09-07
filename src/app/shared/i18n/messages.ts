/**
 * Словарь интерфейса.
 *
 * Вложенный объект, а не плоские ключи и не пайп с поиском по строке:
 * в шаблоне `{{ t().decks.study }}` проверяется компилятором, опечатка
 * не доживает до экрана. Тип задаёт русский словарь, английский обязан ему
 * соответствовать — забытый ключ становится ошибкой сборки, а не пустым
 * местом в интерфейсе.
 *
 * Строки со счётчиками — функции, а не шаблоны с подстановкой: у русского
 * три формы множественного числа, у английского две, и порядок слов в
 * предложении тоже разный. Форму выбирает `plural` из `domain/languages.ts`.
 */

import { Grade, Topic } from '../../domain/models';
import { Lang, plural } from '../../domain/languages';
import { Track } from '../../domain/tracks';

const ru = {
  nav: {
    decks: 'Колоды',
    tasks: 'Задачи',
    stats: 'Прогресс',
    trackAria: 'Направление подготовки',
    langAria: 'Язык интерфейса',
    theme: (name: string) => `Тема: ${name}`,
    themeNames: { system: 'системная', light: 'светлая', dark: 'тёмная' },
  },

  titles: {
    decks: 'Колоды — Interview Trainer',
    review: 'Повторение — Interview Trainer',
    browse: 'Все вопросы — Interview Trainer',
    tasks: 'Задачи — Interview Trainer',
    task: 'Задача — Interview Trainer',
    stats: 'Прогресс — Interview Trainer',
    app: 'Interview Trainer — JS/TS/Angular и Kotlin/Android',
    description:
      'Тренажёр для подготовки к собеседованию: карточки с интервальным повторением и кодовые задачи по JavaScript, TypeScript, Angular, Kotlin, Android SDK, Compose и корутинам.',
  },

  topics: {
    js: 'JavaScript',
    ts: 'TypeScript',
    angular: 'Angular',
    kotlin: 'Kotlin',
    android: 'Android SDK',
    compose: 'Compose',
    coroutines: 'Корутины и Flow',
  } as Record<Topic, string>,

  tracks: {
    subtitle: {
      web: 'JavaScript · TypeScript · Angular',
      android: 'Kotlin · Android SDK · Compose · корутины',
    } as Record<Track, string>,
    tasksBlurb: {
      web: '«Что выведет этот код» — event loop, this, замыкания, приведение типов и дженерики. Код запускается прямо в браузере, вывод сверяется с фактическим.',
      android:
        '«Что выведет этот код» — корутины и Flow, отмена, scope-функции, data-классы и статическая диспетчеризация. Kotlin в браузере не выполняется: ответ сверяется с записанным, а тот проверен настоящим компилятором при сборке.',
    } as Record<Track, string>,
  },

  content: {
    error: (message: string) => `Не удалось загрузить корпус вопросов: ${message}`,
    loadFailed: (path: string, status: number) => `Не удалось загрузить ${path}: ${status}`,
    /** Плашка над колодой, которую ещё не перевели. */
    fallback: 'Эта тема ещё не переведена — показан русский оригинал.',
  },

  decks: {
    heading: 'Что повторяем сегодня',
    track: 'Направление',
    hint: 'Карточки показываются по интервальному алгоритму: чем увереннее ответ, тем дольше карточка не вернётся.',
    streakTitle: 'Дней подряд с занятиями',
    reviewAll: (n: number) =>
      `Повторять всё — ${n} ${plural('ru', n, ['карточка', 'карточки', 'карточек'])}`,
    total: (n: number) => `${n} ${plural('ru', n, ['карточка', 'карточки', 'карточек'])}`,
    due: 'к повторению',
    fresh: 'новых',
    mastered: (mastered: number, total: number, percent: number) =>
      `Выучено ${mastered} из ${total} — ${percent}%`,
    browse: 'Все вопросы',
    study: 'Заниматься',
    tasksHeading: 'Кодовые задачи',
    tasksLeft: (n: number) => `Нерешённых задач: ${n}`,
    toTasks: 'К задачам',
  },

  review: {
    allTopics: 'Все темы',
    details: 'Подробный разбор',
    reveal: 'Показать ответ',
    space: 'пробел',
    grades: {
      again: 'Не помню',
      hard: 'Трудно',
      good: 'Помню',
      easy: 'Легко',
    } as Record<Grade, string>,
    // Предсказанный интервал на кнопке оценки: «через 6 дней» читается лучше, чем «6».
    interval: {
      today: 'сегодня',
      tomorrow: 'завтра',
      days: (n: number) => `${n} дн.`,
      months: (n: number) => `${n} мес.`,
      years: (n: number) => `${n} г.`,
    },
    doneHeading: 'На сегодня всё',
    donePassed: (n: number) =>
      `Пройдено ${plural('ru', n, ['карточка', 'карточки', 'карточек'])}: ${n}. Следующие вернутся по расписанию.`,
    doneEmpty: 'В этой колоде сейчас нечего повторять — все карточки отложены на будущее.',
    toTasks: 'К кодовым задачам',
    toDecks: 'К колодам',
  },

  browse: {
    jump: 'Перейти к вопросу',
    reveal: 'Показать ответ',
    space: 'пробел',
    previous: 'Назад',
    next: 'Далее',
    hint: 'Стрелки листают, пробел показывает ответ',
    finished: 'Колода пройдена',
    empty: 'В этой колоде пока нет карточек.',
    backToDecks: 'Вернуться к колодам',
  },

  tasks: {
    heading: 'Кодовые задачи',
    all: 'Все',
    solved: (solved: number, total: number) => `Решено ${solved} из ${total}`,
    empty: 'Задач по этой теме пока нет.',
  },

  task: {
    notRunnable:
      'Kotlin в браузере не выполняется: ответ сверяется с записанным в задаче — он проверен на настоящем компиляторе при сборке. Редактор только для чтения.',
    predictionLabel: 'Что выведет? По строке на каждый вывод',
    predictionHint: 'Кавычки и лишние пробелы не важны — сверяется содержимое строк',
    check: 'Проверить',
    revealAnswer: 'Показать ответ',
    retry: 'Ещё раз',
    nextTask: 'Следующая задача',
    runFailed: 'Код не выполнился',
    noVerdict:
      'Вердикт не выносится: сверять ответ не с чем. Поправьте код или верните исходный кнопкой «Ещё раз».',
    passed: 'Верно',
    failed: 'Не сходится',
    mismatch: (line: number) => `расхождение со строки ${line}`,
    yourAnswer: 'Ваш ответ',
    actualOutput: 'Фактический вывод',
    correctAnswer: 'Правильный ответ',
    explanation: 'Разбор',
    notFound: 'Задача не найдена.',
    toList: 'К списку задач',
  },

  runner: {
    timeout: (seconds: number) =>
      `Выполнение прервано через ${seconds} с — похоже на бесконечный цикл.`,
    error: 'Ошибка выполнения',
  },

  stats: {
    heading: 'Прогресс',
    streak: 'дней подряд',
    mastered: 'карточек выучено',
    due: 'ждут повторения',
    solved: 'задач решено',
    byTopic: 'По темам',
    topicLine: (seen: number, total: number, mastered: number) =>
      `пройдено ${seen} из ${total}, выучено ${mastered}`,
    weak: 'Слабые места',
    weakEmpty: 'Пока пусто: подтема попадает сюда, когда на её карточках срабатывает «Не помню».',
    weakHint: 'Подтемы, которые чаще всего забываются.',
    tasksHeading: 'Кодовые задачи',
    noAttempts: 'Ни одной попытки — самое время начать.',
    attempts: (attempts: number, accuracy: number) =>
      `Попыток: ${attempts}, из них верных — ${accuracy}%.`,
    toTasks: 'К задачам',
    reset: 'Сбросить весь прогресс',
    resetConfirm: 'Удалить весь прогресс? Действие необратимо.',
  },
};

export type Messages = typeof ru;

const en: Messages = {
  nav: {
    decks: 'Decks',
    tasks: 'Tasks',
    stats: 'Progress',
    trackAria: 'Study track',
    langAria: 'Interface language',
    theme: (name: string) => `Theme: ${name}`,
    themeNames: { system: 'system', light: 'light', dark: 'dark' },
  },

  titles: {
    decks: 'Decks — Interview Trainer',
    review: 'Review — Interview Trainer',
    browse: 'All questions — Interview Trainer',
    tasks: 'Tasks — Interview Trainer',
    task: 'Task — Interview Trainer',
    stats: 'Progress — Interview Trainer',
    app: 'Interview Trainer — JS/TS/Angular and Kotlin/Android',
    description:
      'Interview prep trainer: spaced-repetition flashcards and code tasks on JavaScript, TypeScript, Angular, Kotlin, Android SDK, Compose and coroutines.',
  },

  topics: {
    js: 'JavaScript',
    ts: 'TypeScript',
    angular: 'Angular',
    kotlin: 'Kotlin',
    android: 'Android SDK',
    compose: 'Compose',
    coroutines: 'Coroutines and Flow',
  },

  tracks: {
    subtitle: {
      web: 'JavaScript · TypeScript · Angular',
      android: 'Kotlin · Android SDK · Compose · coroutines',
    },
    tasksBlurb: {
      web: '“What does this code print” — the event loop, this, closures, type coercion and generics. The code runs right in the browser and the verdict comes from its actual output.',
      android:
        '“What does this code print” — coroutines and Flow, cancellation, scope functions, data classes and static dispatch. Kotlin does not run in the browser: your answer is checked against a recorded output, verified by a real compiler at build time.',
    },
  },

  content: {
    error: (message: string) => `Could not load the question corpus: ${message}`,
    loadFailed: (path: string, status: number) => `Could not load ${path}: ${status}`,
    fallback: 'This deck has not been translated yet — showing the Russian original.',
  },

  decks: {
    heading: 'What are we reviewing today',
    track: 'Track',
    hint: 'Cards come back on a spaced-repetition schedule: the more confident your answer, the longer until you see the card again.',
    streakTitle: 'Days in a row with a session',
    reviewAll: (n: number) => `Review everything — ${n} ${plural('en', n, ['card', 'cards'])}`,
    total: (n: number) => `${n} ${plural('en', n, ['card', 'cards'])}`,
    due: 'due',
    fresh: 'new',
    mastered: (mastered: number, total: number, percent: number) =>
      `Mastered ${mastered} of ${total} — ${percent}%`,
    browse: 'All questions',
    study: 'Study',
    tasksHeading: 'Code tasks',
    tasksLeft: (n: number) => `Unsolved tasks: ${n}`,
    toTasks: 'To the tasks',
  },

  review: {
    allTopics: 'All topics',
    details: 'Full explanation',
    reveal: 'Show answer',
    space: 'space',
    grades: {
      again: 'Forgot',
      hard: 'Hard',
      good: 'Good',
      easy: 'Easy',
    },
    interval: {
      today: 'today',
      tomorrow: 'tomorrow',
      days: (n: number) => `${n} d`,
      months: (n: number) => `${n} mo`,
      years: (n: number) => `${n} y`,
    },
    doneHeading: 'That is it for today',
    donePassed: (n: number) =>
      `${n} ${plural('en', n, ['card', 'cards'])} done. The rest come back on schedule.`,
    doneEmpty: 'Nothing to review in this deck right now — every card is scheduled for later.',
    toTasks: 'To the code tasks',
    toDecks: 'To the decks',
  },

  browse: {
    jump: 'Jump to question',
    reveal: 'Show answer',
    space: 'space',
    previous: 'Back',
    next: 'Next',
    hint: 'Arrows flip through cards, space shows the answer',
    finished: 'Deck finished',
    empty: 'This deck has no cards yet.',
    backToDecks: 'Back to the decks',
  },

  tasks: {
    heading: 'Code tasks',
    all: 'All',
    solved: (solved: number, total: number) => `Solved ${solved} of ${total}`,
    empty: 'No tasks on this topic yet.',
  },

  task: {
    notRunnable:
      'Kotlin does not run in the browser: your answer is checked against the output recorded in the task — verified by a real compiler at build time. The editor is read-only.',
    predictionLabel: 'What does it print? One line per output',
    predictionHint: 'Quotes and extra spaces do not matter — only the content of each line',
    check: 'Check',
    revealAnswer: 'Show answer',
    retry: 'Try again',
    nextTask: 'Next task',
    runFailed: 'The code did not run',
    noVerdict:
      'No verdict: there is nothing to compare against. Fix the code or restore the original with “Try again”.',
    passed: 'Correct',
    failed: 'Does not match',
    mismatch: (line: number) => `first mismatch on line ${line}`,
    yourAnswer: 'Your answer',
    actualOutput: 'Actual output',
    correctAnswer: 'Correct answer',
    explanation: 'Explanation',
    notFound: 'Task not found.',
    toList: 'To the task list',
  },

  runner: {
    timeout: (seconds: number) =>
      `Execution stopped after ${seconds} s — this looks like an infinite loop.`,
    error: 'Execution error',
  },

  stats: {
    heading: 'Progress',
    streak: 'days in a row',
    mastered: 'cards mastered',
    due: 'awaiting review',
    solved: 'tasks solved',
    byTopic: 'By topic',
    topicLine: (seen: number, total: number, mastered: number) =>
      `seen ${seen} of ${total}, mastered ${mastered}`,
    weak: 'Weak spots',
    weakEmpty: 'Empty so far: a subtopic lands here once its cards get a “Forgot”.',
    weakHint: 'The subtopics you forget most often.',
    tasksHeading: 'Code tasks',
    noAttempts: 'No attempts yet — a good moment to start.',
    attempts: (attempts: number, accuracy: number) =>
      `Attempts: ${attempts}, correct — ${accuracy}%.`,
    toTasks: 'To the tasks',
    reset: 'Reset all progress',
    resetConfirm: 'Delete all progress? This cannot be undone.',
  },
};

export const MESSAGES: Record<Lang, Messages> = { ru, en };
