import { InjectionToken } from '@angular/core';
import { IndexedDbProgressStorage } from './indexed-db-storage';
import { MemoryProgressStorage, ProgressStorage } from './progress-storage';

/**
 * Реализация хранилища выбирается один раз здесь. В тестах токен
 * переопределяется на `MemoryProgressStorage`, в браузере без IndexedDB
 * (приватные режимы, старые сборки) приложение продолжает работать,
 * просто прогресс не переживёт перезагрузку.
 */
export const PROGRESS_STORAGE = new InjectionToken<ProgressStorage>('PROGRESS_STORAGE', {
  providedIn: 'root',
  factory: () =>
    typeof indexedDB === 'undefined' ? new MemoryProgressStorage() : new IndexedDbProgressStorage(),
});
