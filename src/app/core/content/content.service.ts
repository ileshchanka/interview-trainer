/**
 * Загрузка корпуса вопросов и задач.
 *
 * Контент — статические JSON в `public/content`: он версионируется в git,
 * обновляется деплоем и не занимает место в браузерной базе, где живёт
 * только прогресс.
 *
 * Грузится всегда ровно один трек. Держать в памяти оба незачем: экраны
 * показывают только текущий, а так фильтрация по треку получается сама
 * собой — чужих карточек в сервисе просто нет.
 */

import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Card, CodeTask, Topic } from '../../domain/models';
import { TOPICS_BY_TRACK, Track } from '../../domain/tracks';
import { TrackService } from '../../shared/track.service';

/** Файл темы: `content/<трек>/<тема>.json`. Новая тема добавляется в `tracks.ts`. */
function cardsFile(track: Track, topic: Topic): string {
  return `content/${track}/${topic}.json`;
}

function tasksFile(track: Track): string {
  return `content/${track}/tasks.json`;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly tracks = inject(TrackService);

  private readonly cardsSignal = signal<readonly Card[]>([]);
  private readonly tasksSignal = signal<readonly CodeTask[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  /** Какой трек лежит в сигналах — чтобы не перезагружать один и тот же. */
  private loadedTrack: Track | null = null;

  readonly cards = this.cardsSignal.asReadonly();
  readonly tasks = this.tasksSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly cardById = computed(() => new Map(this.cardsSignal().map((c) => [c.id, c])));
  readonly taskById = computed(() => new Map(this.tasksSignal().map((t) => [t.id, t])));

  constructor() {
    // Смена трека в шапке — это полная замена корпуса. Первый прогон эффекта
    // приходится на тот же трек, который уже грузит инициализатор приложения,
    // поэтому повтор отсекается по `loadedTrack`.
    effect(() => {
      const track = this.tracks.track();
      if (track !== this.loadedTrack) {
        void untracked(() => this.load());
      }
    });
  }

  async load(): Promise<void> {
    const track = this.tracks.track();
    try {
      const [cardSets, tasks] = await Promise.all([
        Promise.all(
          TOPICS_BY_TRACK[track].map((topic) => fetchJson<Card[]>(cardsFile(track, topic))),
        ),
        fetchJson<CodeTask[]>(tasksFile(track)),
      ]);
      this.cardsSignal.set(cardSets.flat());
      this.tasksSignal.set(tasks);
      this.errorSignal.set(null);
      this.loadedTrack = track;
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
