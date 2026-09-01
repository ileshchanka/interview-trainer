/**
 * Загрузка корпуса вопросов и задач.
 *
 * Контент — статические JSON в `public/content`: он версионируется в git,
 * обновляется деплоем и не занимает место в браузерной базе, где живёт
 * только прогресс.
 */

import { Injectable, computed, signal } from '@angular/core';
import { Card, CodeTask, Topic, TOPICS } from '../../domain/models';

/** Файлы корпуса. Имя файла совпадает с темой — новую тему добавлять сюда. */
const CARD_FILES: Record<Topic, string> = {
  js: 'content/js.json',
  ts: 'content/ts.json',
  angular: 'content/angular.json',
};

const TASKS_FILE = 'content/code-tasks.json';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly cardsSignal = signal<readonly Card[]>([]);
  private readonly tasksSignal = signal<readonly CodeTask[]>([]);
  private readonly errorSignal = signal<string | null>(null);

  readonly cards = this.cardsSignal.asReadonly();
  readonly tasks = this.tasksSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly cardById = computed(() => new Map(this.cardsSignal().map((c) => [c.id, c])));
  readonly taskById = computed(() => new Map(this.tasksSignal().map((t) => [t.id, t])));

  async load(): Promise<void> {
    try {
      const [cardSets, tasks] = await Promise.all([
        Promise.all(TOPICS.map((topic) => fetchJson<Card[]>(CARD_FILES[topic]))),
        fetchJson<CodeTask[]>(TASKS_FILE),
      ]);
      this.cardsSignal.set(cardSets.flat());
      this.tasksSignal.set(tasks);
      this.errorSignal.set(null);
    } catch (error) {
      // Приложение без контента бесполезно, но белый экран хуже сообщения.
      this.errorSignal.set(error instanceof Error ? error.message : String(error));
    }
  }

  cardsOf(topic: Topic): Card[] {
    return this.cardsSignal().filter((card) => card.topic === topic);
  }

  tasksOf(topic: Topic): CodeTask[] {
    return this.tasksSignal().filter((task) => task.topic === topic);
  }
}

/**
 * Путь разрешается относительно `<base href>`, а не текущего адреса:
 * иначе с маршрута `/review/js` запрос ушёл бы в `/review/content/js.json`.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const url = new URL(path, document.baseURI).toString();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}
