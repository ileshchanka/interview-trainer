/**
 * Агрегаты по прогрессу: что показать на экране статистики и откуда взять
 * список слабых мест. Чистые функции над теми же картами состояний.
 */

import { Card, ReviewState, Topic } from './models';
import { isDue, isMastered } from './srs';

export interface TopicProgress {
  readonly topic: Topic;
  readonly total: number;
  /** Сколько карточек человек хотя бы раз видел. */
  readonly seen: number;
  readonly mastered: number;
  readonly due: number;
}

export function topicProgress(
  cards: readonly Card[],
  states: ReadonlyMap<string, ReviewState>,
  now: number,
  topics: readonly Topic[],
): TopicProgress[] {
  return topics.map((topic) => {
    const pool = cards.filter((card) => card.topic === topic);
    let seen = 0;
    let mastered = 0;
    let due = 0;
    for (const card of pool) {
      const state = states.get(card.id);
      if (state === undefined) {
        continue;
      }
      seen++;
      if (isMastered(state)) {
        mastered++;
      }
      if (isDue(state, now)) {
        due++;
      }
    }
    return { topic, total: pool.length, seen, mastered, due };
  });
}

export interface WeakSpot {
  readonly subtopic: string;
  readonly topic: Topic;
  readonly lapses: number;
  readonly cards: number;
}

/**
 * Слабые места — подтемы, на которых чаще всего срабатывает «не помню».
 * Считаются по подтемам, а не по отдельным карточкам: одна забытая карточка
 * ещё ничего не говорит, а три из одной подтемы — уже диагноз.
 */
export function weakSpots(
  cards: readonly Card[],
  states: ReadonlyMap<string, ReviewState>,
  limit = 5,
): WeakSpot[] {
  const buckets = new Map<string, WeakSpot>();

  for (const card of cards) {
    const state = states.get(card.id);
    if (state === undefined || state.lapses === 0) {
      continue;
    }
    const key = `${card.topic}/${card.subtopic}`;
    const current = buckets.get(key);
    buckets.set(key, {
      subtopic: card.subtopic,
      topic: card.topic,
      lapses: (current?.lapses ?? 0) + state.lapses,
      cards: (current?.cards ?? 0) + 1,
    });
  }

  return [...buckets.values()].sort((a, b) => b.lapses - a.lapses).slice(0, limit);
}

/** Ключ локального дня — по нему считается серия. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Серия дней подряд с занятиями, считая от сегодня.
 *
 * Вчерашний день серию не обрывает: пока сегодняшнее занятие не началось,
 * показывать «серия 0» вместо «серия 12» было бы обидной неправдой.
 */
export function streakDays(reviewTimes: readonly number[], now: number): number {
  if (reviewTimes.length === 0) {
    return 0;
  }
  const days = new Set(reviewTimes.filter((t) => t > 0).map(dayKey));
  if (days.size === 0) {
    return 0;
  }

  // Шаг делается по календарю, а не вычитанием 86 400 000 мс: в день перевода
  // часов сутки короче или длиннее, и арифметика в миллисекундах либо
  // проскакивает день, либо считает один день дважды.
  const yesterday = shiftDay(now, -1);
  if (!days.has(dayKey(now)) && !days.has(dayKey(yesterday))) {
    return 0;
  }

  let streak = 0;
  let cursor = days.has(dayKey(now)) ? now : yesterday;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Сдвиг на целые сутки по локальному календарю. */
function shiftDay(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}
