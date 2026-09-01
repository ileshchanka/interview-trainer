/**
 * Интервальное повторение по мотивам SM-2.
 *
 * Модуль намеренно чистый и детерминированный: `now` всегда приходит
 * параметром, а не берётся из `Date.now()` внутри. Иначе алгоритм, вся суть
 * которого в датах, невозможно проверить тестами.
 */

import { Grade, ReviewState } from './models';

export const DAY_MS = 86_400_000;

/**
 * Пол коэффициента лёгкости. Без него одна упорно забываемая карточка
 * загоняет себя в бесконечный ежедневный показ и вытесняет всё остальное.
 */
export const MIN_EASE = 1.3;

export const DEFAULT_EASE = 2.5;

/** Потолок интервала: год — предел, дальше «помню» уже ничего не значит. */
export const MAX_INTERVAL_DAYS = 365;

const EASE_DELTA: Record<Grade, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** Первый интервал (в днях) для карточки, которую ещё ни разу не вспомнили. */
const FIRST_INTERVAL: Record<Grade, number> = {
  again: 0,
  hard: 1,
  good: 1,
  easy: 4,
};

/** Второй интервал — после первого успешного вспоминания. */
const SECOND_INTERVAL: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 6,
  easy: 8,
};

/** Множитель интервала на зрелой карточке. */
const GROWTH: Record<Grade, (ease: number) => number> = {
  again: () => 0,
  hard: () => 1.2,
  good: (ease) => ease,
  easy: (ease) => ease * 1.3,
};

/** Состояние карточки, которую человек ещё не видел. */
export function initialState(cardId: string, now: number): ReviewState {
  return {
    cardId,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
    lapses: 0,
    lastReviewedAt: 0,
  };
}

/** Карточка ждёт повторения: срок наступил или она вообще новая. */
export function isDue(state: ReviewState | undefined, now: number): boolean {
  return state === undefined || state.dueAt <= now;
}

/** Карточку можно считать выученной: пережила три повторения и ушла за неделю. */
export function isMastered(state: ReviewState | undefined): boolean {
  return state !== undefined && state.repetitions >= 3 && state.intervalDays >= 7;
}

/**
 * Новое состояние карточки после оценки.
 *
 * `dueAt` отсчитывается от момента ответа, а не от прошлого `dueAt`: иначе
 * после недельного перерыва вся колода оказывается «просрочена в прошлое»,
 * интервалы схлопываются и порядок повторений теряет смысл.
 */
export function review(state: ReviewState, grade: Grade, now: number): ReviewState {
  const ease = clampEase(state.ease + EASE_DELTA[grade]);

  if (grade === 'again') {
    return {
      ...state,
      ease,
      intervalDays: 0,
      repetitions: 0,
      lapses: state.lapses + 1,
      // Срок уже наступил: карточка вернётся в этой же сессии.
      dueAt: now,
      lastReviewedAt: now,
    };
  }

  const intervalDays = nextInterval(state, grade, ease);

  return {
    ...state,
    ease,
    intervalDays,
    repetitions: state.repetitions + 1,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}

function nextInterval(state: ReviewState, grade: Grade, ease: number): number {
  if (state.repetitions === 0) {
    return FIRST_INTERVAL[grade];
  }
  if (state.repetitions === 1) {
    return SECOND_INTERVAL[grade];
  }
  const grown = Math.round(state.intervalDays * GROWTH[grade](ease));
  // Зрелая карточка не должна «схлопнуться»: шаг вперёд всегда хотя бы на день.
  return Math.min(Math.max(grown, state.intervalDays + 1), MAX_INTERVAL_DAYS);
}

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, Math.round(ease * 100) / 100);
}
