/**
 * Модели предметной области. Чистый TypeScript: ни Angular, ни DOM, ни сети.
 *
 * Контент (карточки и кодовые задачи) приезжает статикой из `public/content`,
 * прогресс живёт в IndexedDB. Связывает их стабильный строковый `id`, поэтому
 * переформулировка вопроса не сбрасывает накопленный прогресс.
 */

export type Topic = 'js' | 'ts' | 'angular' | 'kotlin' | 'android' | 'compose' | 'coroutines';

/** Все темы разом. Разбиение по трекам живёт в `tracks.ts`. */
export const TOPICS: readonly Topic[] = [
  'js',
  'ts',
  'angular',
  'kotlin',
  'android',
  'compose',
  'coroutines',
] as const;

export const TOPIC_TITLES: Record<Topic, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  angular: 'Angular',
  kotlin: 'Kotlin',
  android: 'Android SDK',
  compose: 'Compose',
  coroutines: 'Корутины и Flow',
};

/** Самооценка после показа ответа — четыре градации, как в Anki. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'] as const;

export interface Card {
  readonly id: string;
  readonly topic: Topic;
  /** Подтема — по ней группируется статистика и слабые места. */
  readonly subtopic: string;
  /** Вопрос в Markdown. */
  readonly question: string;
  /** Короткий ответ в Markdown — то, что нужно вспомнить. */
  readonly answer: string;
  /**
   * Пример кода в Markdown — отдельным полем, а не внутри разбора: он
   * показывается сразу вместе с ответом, а разбор человек читает по желанию.
   */
  readonly example?: string;
  /** Развёрнутый разбор: почему так, где подвох. */
  readonly explanation?: string;
}

/**
 * Язык кодовой задачи. От него зависит не только подсветка: JavaScript и
 * TypeScript браузер выполняет по-настоящему, а Kotlin выполнить нечем —
 * см. `isRunnable`.
 */
export type TaskLanguage = 'js' | 'ts' | 'kotlin';

/**
 * Можно ли выполнить код задачи прямо в браузере.
 *
 * Единственное место, где живёт знание «Kotlin не запускается». Экраны и
 * скрипты проверки обязаны спрашивать здесь, а не сравнивать язык со строкой:
 * иначе при добавлении Swift или Java условие придётся искать по всему коду.
 */
/** Короткая подпись языка для списка задач. */
export const LANGUAGE_LABELS: Record<TaskLanguage, string> = {
  js: 'JS',
  ts: 'TS',
  kotlin: 'Kotlin',
};

export function isRunnable(language: TaskLanguage): boolean {
  return language === 'js' || language === 'ts';
}

export interface CodeTask {
  readonly id: string;
  readonly topic: Topic;
  readonly subtopic: string;
  readonly title: string;
  readonly language: TaskLanguage;
  /** Что именно спрашивается — обычно «что выведет этот код». */
  readonly prompt: string;
  /** Код, который открывается в редакторе. */
  readonly code: string;
  /**
   * Ожидаемый вывод построчно: одна строка на один вызов печати.
   *
   * Для исполняемых языков это справочное значение (истину даёт запуск),
   * для Kotlin — единственный источник вердикта, поэтому он сверяется
   * с реальностью скриптом `scripts/verify-content.mjs`.
   */
  readonly expectedOutput: readonly string[];
  readonly explanation: string;
}

/**
 * Состояние интервального повторения одной карточки.
 * Время — всегда UTC-миллисекунды: локальная зона появляется только на экране.
 */
export interface ReviewState {
  readonly cardId: string;
  /** Коэффициент лёгкости SM-2, не опускается ниже MIN_EASE. */
  readonly ease: number;
  readonly intervalDays: number;
  /** Сколько раз подряд карточку вспомнили; `again` сбрасывает в ноль. */
  readonly repetitions: number;
  readonly dueAt: number;
  /** Сколько раз забывали — по нему определяются слабые места. */
  readonly lapses: number;
  readonly lastReviewedAt: number;
}

/** Попытка решить кодовую задачу. */
export interface Attempt {
  readonly taskId: string;
  readonly at: number;
  readonly passed: boolean;
}
