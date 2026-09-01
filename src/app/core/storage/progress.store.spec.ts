import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryProgressStorage } from './progress-storage';
import { PROGRESS_STORAGE } from './progress-storage.token';
import { ProgressStore } from './progress.store';

describe('ProgressStore', () => {
  let storage: MemoryProgressStorage;
  let store: ProgressStore;

  beforeEach(async () => {
    storage = new MemoryProgressStorage();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PROGRESS_STORAGE, useValue: storage },
      ],
    });
    store = TestBed.inject(ProgressStore);
    await store.init();
  });

  it('оценка карточки создаёт состояние и откладывает её на будущее', () => {
    const now = Date.parse('2026-09-01T12:00:00Z');

    const state = store.grade('card-1', 'good', now);

    expect(state.repetitions).toBe(1);
    expect(store.states().get('card-1')?.dueAt).toBeGreaterThan(now);
  });

  it('прогресс переживает перезагрузку: новый стор читает то же хранилище', async () => {
    store.grade('card-1', 'easy');

    // Тот же экземпляр хранилища при новом инжекторе — это и есть перезапуск.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PROGRESS_STORAGE, useValue: storage },
      ],
    });
    const fresh = TestBed.inject(ProgressStore);
    await fresh.init();

    expect(fresh.states().has('card-1')).toBe(true);
  });

  it('решённой задача считается после первой успешной попытки', () => {
    store.recordAttempt('task-1', false);
    expect(store.solvedTasks().has('task-1')).toBe(false);

    store.recordAttempt('task-1', true);
    expect(store.solvedTasks().has('task-1')).toBe(true);
  });

  it('сброс очищает и память, и хранилище', async () => {
    store.grade('card-1', 'good');
    store.recordAttempt('task-1', true);

    await store.reset();

    expect(store.states().size).toBe(0);
    expect(await storage.loadStates()).toEqual([]);
    expect(await storage.loadAttempts()).toEqual([]);
  });
});
