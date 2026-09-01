/**
 * Сборка и проживание одной сессии повторения. Чистый модуль: на вход —
 * карточки и их состояния, на выход — очередь идентификаторов.
 */

import { Card, Grade, ReviewState, Topic } from './models';
import { isDue } from './srs';

export interface SessionOptions {
  /** Сколько новых карточек добавить. Без лимита вся колода валится в один день. */
  readonly newLimit: number;
  /** Потолок на просроченные: после перерыва их может быть сотня. */
  readonly reviewLimit: number;
  /** Ограничить сессию одной темой; `undefined` — все темы. */
  readonly topic?: Topic;
}

export const DEFAULT_SESSION: SessionOptions = { newLimit: 10, reviewLimit: 40 };

export interface SessionQueue {
  /** Что осталось показать; голова очереди — текущая карточка. */
  readonly pending: readonly string[];
  /** Что уже закрыто в этой сессии. */
  readonly done: readonly string[];
}

/**
 * Очередь на сессию: сначала просроченные (самые давние впереди), затем новые.
 *
 * Порядок детерминированный, без случайности: так сессию можно воспроизвести
 * в тесте, а человек видит сначала то, что действительно забывается.
 */
export function buildSession(
  cards: readonly Card[],
  states: ReadonlyMap<string, ReviewState>,
  now: number,
  options: SessionOptions = DEFAULT_SESSION,
): SessionQueue {
  const pool = options.topic ? cards.filter((c) => c.topic === options.topic) : cards;

  const due = pool
    .filter((card) => {
      const state = states.get(card.id);
      return state !== undefined && isDue(state, now);
    })
    .sort((a, b) => states.get(a.id)!.dueAt - states.get(b.id)!.dueAt)
    .slice(0, options.reviewLimit);

  const fresh = pool.filter((card) => !states.has(card.id)).slice(0, options.newLimit);

  return { pending: [...due, ...fresh].map((card) => card.id), done: [] };
}

/**
 * Ответ на текущую карточку.
 *
 * `again` возвращает карточку в конец очереди — в пределах одной сессии
 * забытое нужно увидеть ещё раз, иначе оценка «не помню» ничего не меняет
 * до следующего дня.
 */
export function advance(queue: SessionQueue, grade: Grade): SessionQueue {
  const [current, ...rest] = queue.pending;
  if (current === undefined) {
    return queue;
  }
  if (grade === 'again') {
    return { pending: [...rest, current], done: queue.done };
  }
  return { pending: rest, done: [...queue.done, current] };
}

/** Сколько карточек ждут повторения прямо сейчас (новые считаются отдельно). */
export function dueCount(
  cards: readonly Card[],
  states: ReadonlyMap<string, ReviewState>,
  now: number,
): number {
  return cards.filter((card) => {
    const state = states.get(card.id);
    return state !== undefined && isDue(state, now);
  }).length;
}

/** Сколько карточек человек ещё ни разу не видел. */
export function newCount(cards: readonly Card[], states: ReadonlyMap<string, ReviewState>): number {
  return cards.filter((card) => !states.has(card.id)).length;
}
