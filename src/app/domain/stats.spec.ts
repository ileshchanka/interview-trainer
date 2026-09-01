import { describe, expect, it } from 'vitest';
import { Card, ReviewState } from './models';
import { DAY_MS, initialState } from './srs';
import { streakDays, topicProgress, weakSpots } from './stats';

const NOW = Date.parse('2026-09-01T12:00:00Z');

function card(id: string, topic: Card['topic'], subtopic: string): Card {
  return { id, topic, subtopic, question: id, answer: id };
}

function state(cardId: string, patch: Partial<ReviewState>): ReviewState {
  return { ...initialState(cardId, NOW), ...patch };
}

describe('topicProgress', () => {
  it('считает виденные, выученные и просроченные по каждой теме', () => {
    const cards = [
      card('a', 'js', 'замыкания'),
      card('b', 'js', 'this'),
      card('c', 'angular', 'DI'),
    ];
    const states = new Map([
      ['a', state('a', { repetitions: 4, intervalDays: 30, dueAt: NOW + 10 * DAY_MS })],
      ['b', state('b', { repetitions: 1, intervalDays: 1, dueAt: NOW - DAY_MS })],
    ]);

    const [js, angular] = topicProgress(cards, states, NOW, ['js', 'angular']);

    expect(js).toEqual({ topic: 'js', total: 2, seen: 2, mastered: 1, due: 1 });
    expect(angular).toEqual({ topic: 'angular', total: 1, seen: 0, mastered: 0, due: 0 });
  });
});

describe('weakSpots', () => {
  it('группирует промахи по подтемам и ставит худшие вперёд', () => {
    const cards = [
      card('a', 'js', 'event loop'),
      card('b', 'js', 'event loop'),
      card('c', 'ts', 'дженерики'),
    ];
    const states = new Map([
      ['a', state('a', { lapses: 2 })],
      ['b', state('b', { lapses: 3 })],
      ['c', state('c', { lapses: 1 })],
    ]);

    const spots = weakSpots(cards, states, 5);

    expect(spots[0]).toEqual({ subtopic: 'event loop', topic: 'js', lapses: 5, cards: 2 });
    expect(spots[1].subtopic).toBe('дженерики');
  });

  it('карточки без промахов в слабые места не попадают', () => {
    const cards = [card('a', 'js', 'замыкания')];
    expect(weakSpots(cards, new Map([['a', state('a', { lapses: 0 })]]))).toEqual([]);
  });
});

describe('streakDays', () => {
  it('считает дни подряд, включая сегодняшний', () => {
    const times = [NOW, NOW - DAY_MS, NOW - 2 * DAY_MS];
    expect(streakDays(times, NOW)).toBe(3);
  });

  it('пропущенный день обрывает серию', () => {
    const times = [NOW, NOW - 2 * DAY_MS, NOW - 3 * DAY_MS];
    expect(streakDays(times, NOW)).toBe(1);
  });

  it('вчерашнее занятие серию держит: сегодня ещё не поздно', () => {
    expect(streakDays([NOW - DAY_MS, NOW - 2 * DAY_MS], NOW)).toBe(2);
  });

  it('позавчерашнее — уже нет', () => {
    expect(streakDays([NOW - 2 * DAY_MS], NOW)).toBe(0);
  });

  it('без занятий серии нет', () => {
    expect(streakDays([], NOW)).toBe(0);
    expect(streakDays([0], NOW)).toBe(0);
  });
});
