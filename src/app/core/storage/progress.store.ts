/**
 * Прогресс в памяти приложения: signals поверх асинхронного хранилища.
 *
 * Экраны читают синхронные сигналы, запись уходит в IndexedDB в фоне —
 * ждать базу перед перерисовкой карточки незачем.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Attempt, Grade, ReviewState } from '../../domain/models';
import { initialState, review } from '../../domain/srs';
import { PROGRESS_STORAGE } from './progress-storage.token';

@Injectable({ providedIn: 'root' })
export class ProgressStore {
  private readonly storage = inject(PROGRESS_STORAGE);

  private readonly statesSignal = signal<ReadonlyMap<string, ReviewState>>(new Map());
  private readonly attemptsSignal = signal<readonly Attempt[]>([]);
  private readonly readySignal = signal(false);

  /** Состояния SRS по идентификатору карточки. */
  readonly states = this.statesSignal.asReadonly();
  readonly attempts = this.attemptsSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  /** Отметки времени всех повторений — для подсчёта серии дней. */
  readonly reviewTimes = computed(() =>
    [...this.statesSignal().values()].map((state) => state.lastReviewedAt),
  );

  async init(): Promise<void> {
    const [states, attempts] = await Promise.all([
      this.storage.loadStates(),
      this.storage.loadAttempts(),
    ]);
    this.statesSignal.set(new Map(states.map((state) => [state.cardId, state])));
    this.attemptsSignal.set(attempts);
    this.readySignal.set(true);
  }

  /** Оценка карточки: считаем новое состояние, показываем сразу, пишем в фоне. */
  grade(cardId: string, grade: Grade, now = Date.now()): ReviewState {
    const current = this.statesSignal().get(cardId) ?? initialState(cardId, now);
    const next = review(current, grade, now);

    const map = new Map(this.statesSignal());
    map.set(cardId, next);
    this.statesSignal.set(map);

    void this.storage.saveState(next);
    return next;
  }

  recordAttempt(taskId: string, passed: boolean, now = Date.now()): void {
    const attempt: Attempt = { taskId, at: now, passed };
    this.attemptsSignal.set([...this.attemptsSignal(), attempt]);
    void this.storage.addAttempt(attempt);
  }

  /** Решённой считается задача, которую хоть раз прошли до конца. */
  readonly solvedTasks = computed(
    () =>
      new Set(
        this.attemptsSignal()
          .filter((a) => a.passed)
          .map((a) => a.taskId),
      ),
  );

  async reset(): Promise<void> {
    await this.storage.clear();
    this.statesSignal.set(new Map());
    this.attemptsSignal.set([]);
  }
}
