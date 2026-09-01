/**
 * Реализация хранилища на IndexedDB. Единственное место в приложении,
 * которое знает про базу браузера.
 */

import { IDBPDatabase, openDB } from 'idb';
import { Attempt, ReviewState } from '../../domain/models';
import { ProgressStorage } from './progress-storage';

const DB_NAME = 'interview-trainer';
const DB_VERSION = 1;
const STATES = 'states';
const ATTEMPTS = 'attempts';

export class IndexedDbProgressStorage implements ProgressStorage {
  private db?: Promise<IDBPDatabase>;

  /**
   * Соединение открывается лениво и переиспользуется: `openDB` при каждом
   * вызове плодил бы соединения, а версия базы блокировалась бы сама собой.
   */
  private connect(): Promise<IDBPDatabase> {
    this.db ??= openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STATES)) {
          db.createObjectStore(STATES, { keyPath: 'cardId' });
        }
        if (!db.objectStoreNames.contains(ATTEMPTS)) {
          db.createObjectStore(ATTEMPTS, { autoIncrement: true });
        }
      },
    });
    return this.db;
  }

  async loadStates(): Promise<ReviewState[]> {
    return (await this.connect()).getAll(STATES) as Promise<ReviewState[]>;
  }

  async saveState(state: ReviewState): Promise<void> {
    await (await this.connect()).put(STATES, state);
  }

  async loadAttempts(): Promise<Attempt[]> {
    return (await this.connect()).getAll(ATTEMPTS) as Promise<Attempt[]>;
  }

  async addAttempt(attempt: Attempt): Promise<void> {
    await (await this.connect()).add(ATTEMPTS, attempt);
  }

  async clear(): Promise<void> {
    const db = await this.connect();
    await Promise.all([db.clear(STATES), db.clear(ATTEMPTS)]);
  }
}
