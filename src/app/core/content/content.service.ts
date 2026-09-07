/**
 * Загрузка корпуса вопросов и задач.
 *
 * Контент — статические JSON в `public/content`: он версионируется в git,
 * обновляется деплоем и не занимает место в браузерной базе, где живёт
 * только прогресс.
 *
 * Грузится всегда ровно один трек на одном языке. Держать в памяти больше
 * незачем: экраны показывают только текущий, а так фильтрация по треку
 * получается сама собой — чужих карточек в сервисе просто нет.
 */

import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Card, CodeTask, Topic } from '../../domain/models';
import { Lang, contentLang, tasksLang } from '../../domain/languages';
import { TOPICS_BY_TRACK, Track } from '../../domain/tracks';
import { LanguageService } from '../../shared/language.service';
import { TrackService } from '../../shared/track.service';

/**
 * Файл темы: `content/<язык>/<трек>/<тема>.json`. Язык в пути — не всегда
 * выбранный: непереведённая тема отдаётся в оригинале, и решает это
 * `contentLang`. Новая тема добавляется в `tracks.ts`.
 */
function cardsFile(lang: Lang, track: Track, topic: Topic): string {
  return `content/${contentLang(lang, topic)}/${track}/${topic}.json`;
}

function tasksFile(lang: Lang, track: Track): string {
  return `content/${tasksLang(lang, track)}/${track}/tasks.json`;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly tracks = inject(TrackService);
  private readonly languages = inject(LanguageService);

  private readonly cardsSignal = signal<readonly Card[]>([]);
  private readonly tasksSignal = signal<readonly CodeTask[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  /**
   * Что именно лежит в сигналах — чтобы не перезагружать то же самое.
   * Ключ составной: язык меняется при том же треке, и сравнения по одному
   * треку хватило бы ровно до первого переключения языка.
   */
  private loaded: string | null = null;

  readonly cards = this.cardsSignal.asReadonly();
  readonly tasks = this.tasksSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly cardById = computed(() => new Map(this.cardsSignal().map((c) => [c.id, c])));
  readonly taskById = computed(() => new Map(this.tasksSignal().map((t) => [t.id, t])));

  /**
   * Показан ли вместо выбранного языка оригинал — по этому экраны рисуют
   * плашку. Метод, а не `computed`: тема приходит аргументом, а чтение сигнала
   * внутри вызова шаблон отслеживает так же, как чтение напрямую.
   */
  isFallback(topic: Topic): boolean {
    const lang = this.languages.lang();
    return contentLang(lang, topic) !== lang;
  }

  constructor() {
    // Смена трека или языка в шапке — это полная замена корпуса. Первый прогон
    // эффекта приходится на ту же пару, которую уже грузит инициализатор
    // приложения, поэтому повтор отсекается по `loaded`.
    effect(() => {
      const key = this.key(this.tracks.track(), this.languages.lang());
      if (key !== this.loaded) {
        void untracked(() => this.load());
      }
    });
  }

  async load(): Promise<void> {
    const track = this.tracks.track();
    const lang = this.languages.lang();
    try {
      const [cardSets, tasks] = await Promise.all([
        Promise.all(
          TOPICS_BY_TRACK[track].map((topic) => fetchJson<Card[]>(cardsFile(lang, track, topic))),
        ),
        fetchJson<CodeTask[]>(tasksFile(lang, track)),
      ]);
      this.cardsSignal.set(cardSets.flat());
      this.tasksSignal.set(tasks);
      this.errorSignal.set(null);
      this.loaded = this.key(track, lang);
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

  private key(track: Track, lang: Lang): string {
    return `${lang}/${track}`;
  }
}

/**
 * Путь разрешается относительно `<base href>`, а не текущего адреса:
 * иначе с маршрута `/review/js` запрос ушёл бы в `/review/content/js.json`.
 *
 * Сообщение об ошибке здесь по-английски и не переводится: оно попадает
 * в консоль и в плашку об отказе загрузки, а тянуть словарь в слой, который
 * этот словарь и грузит, значило бы завязать одно на другое.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const url = new URL(path, document.baseURI).toString();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}
