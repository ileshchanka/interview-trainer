import { describe, expect, it } from 'vitest';
import { Card, Grade, ReviewState } from './models';
import {
  DAY_MS,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  initialState,
  isDue,
  isMastered,
  review,
} from './srs';

const NOW = Date.parse('2026-09-01T12:00:00Z');

function grind(grades: Grade[], start = initialState('c', NOW), from = NOW): ReviewState {
  let state = start;
  let now = from;
  for (const grade of grades) {
    state = review(state, grade, now);
    now = state.dueAt;
  }
  return state;
}

describe('srs', () => {
  it('новая карточка ждёт повторения прямо сейчас', () => {
    expect(isDue(initialState('c', NOW), NOW)).toBe(true);
    expect(isDue(undefined, NOW)).toBe(true);
  });

  it('первое «помню» откладывает карточку на день, второе — на неделю', () => {
    const first = review(initialState('c', NOW), 'good', NOW);
    expect(first.intervalDays).toBe(1);
    expect(first.dueAt).toBe(NOW + DAY_MS);

    const second = review(first, 'good', first.dueAt);
    expect(second.intervalDays).toBe(6);
  });

  it('«не помню» сбрасывает интервал и считает промах', () => {
    const mature = grind(['good', 'good', 'good']);
    const lapsed = review(mature, 'again', mature.dueAt);

    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.lapses).toBe(1);
    // Срок уже наступил: карточка вернётся в этой же сессии.
    expect(lapsed.dueAt).toBe(mature.dueAt);
  });

  it('лёгкость не проваливается ниже пола, сколько бы раз ни забывали', () => {
    let state = initialState('c', NOW);
    for (let i = 0; i < 20; i++) {
      state = review(state, 'again', NOW);
    }
    expect(state.ease).toBe(MIN_EASE);
  });

  it('срок считается от момента ответа, а не от прошлого срока', () => {
    const first = review(initialState('c', NOW), 'good', NOW);
    // Человек вернулся через неделю, хотя карточка ждала его назавтра.
    const late = NOW + 7 * DAY_MS;
    const second = review(first, 'good', late);

    expect(second.dueAt).toBe(late + 6 * DAY_MS);
    expect(second.dueAt).toBeGreaterThan(late);
  });

  it('зрелая карточка растёт хотя бы на день даже при «трудно»', () => {
    const mature = grind(['good', 'good', 'good']);
    const hard = review(mature, 'hard', mature.dueAt);
    expect(hard.intervalDays).toBeGreaterThan(mature.intervalDays);
  });

  it('интервал не уходит за год', () => {
    const state = grind(Array<Grade>(20).fill('easy'));
    expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('выученной карточка становится не раньше трёх повторений и недели', () => {
    expect(isMastered(grind(['good']))).toBe(false);
    expect(isMastered(grind(['good', 'good']))).toBe(false);
    expect(isMastered(grind(['good', 'good', 'good']))).toBe(true);
  });
});
