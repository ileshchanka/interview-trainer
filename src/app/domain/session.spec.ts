import { describe, expect, it } from 'vitest';
import { Card, ReviewState } from './models';
import { DAY_MS, initialState, review } from './srs';
import { advance, buildSession, dueCount, newCount } from './session';

const NOW = Date.parse('2026-09-01T12:00:00Z');

function card(id: string, topic: Card['topic'] = 'js'): Card {
  return { id, topic, subtopic: 'основы', question: id, answer: id };
}

function statesOf(...entries: ReviewState[]): Map<string, ReviewState> {
  return new Map(entries.map((s) => [s.cardId, s]));
}

describe('session', () => {
  it('просроченные идут раньше новых, самые давние — впереди', () => {
    const cards = [card('a'), card('b'), card('c')];
    const states = statesOf(
      { ...initialState('a', NOW), dueAt: NOW - DAY_MS },
      { ...initialState('b', NOW), dueAt: NOW - 5 * DAY_MS },
    );

    const queue = buildSession(cards, states, NOW, { newLimit: 10, reviewLimit: 10 });

    expect(queue.pending).toEqual(['b', 'a', 'c']);
  });

  it('новые карточки не сваливаются в один день', () => {
    const cards = Array.from({ length: 50 }, (_, i) => card(`c${i}`));

    const queue = buildSession(cards, new Map(), NOW, { newLimit: 10, reviewLimit: 40 });

    expect(queue.pending).toHaveLength(10);
  });

  it('карточка, срок которой ещё не наступил, в сессию не попадает', () => {
    const cards = [card('a')];
    const states = statesOf(review(initialState('a', NOW), 'good', NOW));

    expect(buildSession(cards, states, NOW).pending).toEqual([]);
    expect(dueCount(cards, states, NOW)).toBe(0);
    expect(dueCount(cards, states, NOW + 2 * DAY_MS)).toBe(1);
  });

  it('сессию можно ограничить одной темой', () => {
    const cards = [card('js1', 'js'), card('ng1', 'angular')];

    const queue = buildSession(cards, new Map(), NOW, {
      newLimit: 10,
      reviewLimit: 10,
      topic: 'angular',
    });

    expect(queue.pending).toEqual(['ng1']);
  });

  it('«не помню» возвращает карточку в конец очереди этой же сессии', () => {
    const queue = { pending: ['a', 'b', 'c'], done: [] };

    const after = advance(queue, 'again');

    expect(after.pending).toEqual(['b', 'c', 'a']);
    expect(after.done).toEqual([]);
  });

  it('любая другая оценка закрывает карточку до следующего раза', () => {
    const after = advance({ pending: ['a', 'b'], done: [] }, 'good');

    expect(after.pending).toEqual(['b']);
    expect(after.done).toEqual(['a']);
  });

  it('пустая очередь не ломается на ответе', () => {
    expect(advance({ pending: [], done: ['a'] }, 'good')).toEqual({ pending: [], done: ['a'] });
  });

  it('новыми считаются только те, которых нет в прогрессе', () => {
    const cards = [card('a'), card('b')];
    expect(newCount(cards, statesOf(initialState('a', NOW)))).toBe(1);
  });
});
