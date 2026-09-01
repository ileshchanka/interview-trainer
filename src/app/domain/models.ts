/**
 * Модели предметной области. Чистый TypeScript: ни Angular, ни DOM, ни сети.
 *
 * Контент (карточки и кодовые задачи) приезжает статикой из `public/content`,
 * прогресс живёт в IndexedDB. Связывает их стабильный строковый `id`, поэтому
 * переформулировка вопроса не сбрасывает накопленный прогресс.
 */

export type Topic = 'js' | 'ts' | 'angular';

export const TOPICS: readonly Topic[] = ['js', 'ts', 'angular'] as const;

export const TOPIC_TITLES: Record<Topic, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  angular: 'Angular',
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
  /** Развёрнутый разбор: почему так, где подвох. */
  readonly explanation?: string;
}

export interface CodeTask {
  readonly id: string;
  readonly topic: Topic;
  readonly subtopic: string;
  readonly title: string;
  readonly language: 'js' | 'ts';
  /** Что именно спрашивается — обычно «что выведет этот код». */
  readonly prompt: string;
  /** Код, который открывается в редакторе. */
  readonly code: string;
  /** Ожидаемый вывод построчно: одна строка на один вызов console.log. */
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
