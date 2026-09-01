/**
 * Хранилище прогресса.
 *
 * Интерфейс отделён от реализации не ради абстракции как таковой: на нём
 * держатся тесты (in-memory) и возможность позже добавить синхронизацию
 * с сервером, не переписывая экраны. Контент здесь не хранится — он статика
 * из `public/content` и версионируется в git.
 */

import { Attempt, ReviewState } from '../../domain/models';

export interface ProgressStorage {
  loadStates(): Promise<ReviewState[]>;
  saveState(state: ReviewState): Promise<void>;
  loadAttempts(): Promise<Attempt[]>;
  addAttempt(attempt: Attempt): Promise<void>;
  clear(): Promise<void>;
}

/** Реализация для тестов и для окружений без IndexedDB. */
export class MemoryProgressStorage implements ProgressStorage {
  private readonly states = new Map<string, ReviewState>();
  private readonly attempts: Attempt[] = [];

  async loadStates(): Promise<ReviewState[]> {
    return [...this.states.values()];
  }

  async saveState(state: ReviewState): Promise<void> {
    this.states.set(state.cardId, state);
  }

  async loadAttempts(): Promise<Attempt[]> {
    return [...this.attempts];
  }

  async addAttempt(attempt: Attempt): Promise<void> {
    this.attempts.push(attempt);
  }

  async clear(): Promise<void> {
    this.states.clear();
    this.attempts.length = 0;
  }
}
