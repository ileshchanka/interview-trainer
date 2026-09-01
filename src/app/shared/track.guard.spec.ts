import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentService } from '../core/content/content.service';
import { CodeTask } from '../domain/models';
import { Track } from '../domain/tracks';
import { TrackService } from './track.service';
import { syncTrackForTaskGuard, syncTrackGuard } from './track.guard';

/** Контент двух треков — как на диске, по файлу задач на трек. */
const TASKS: Record<Track, CodeTask[]> = {
  web: [task('task-web')],
  android: [task('task-kt')],
};

function task(id: string): CodeTask {
  return {
    id,
    topic: 'js',
    subtopic: '',
    title: id,
    language: 'js',
    prompt: '',
    code: '',
    expectedOutput: ['1'],
    explanation: '',
  };
}

function route(params: Record<string, string>): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
}

describe('гарды синхронизации трека', () => {
  let tracks: TrackService;
  let loaded: Track[];

  beforeEach(() => {
    localStorage.clear();
    loaded = [];

    const tasks = signal<readonly CodeTask[]>(TASKS.web);
    const content = {
      tasks,
      taskById: () => new Map(tasks().map((t) => [t.id, t])),
      load: vi.fn(async () => {
        const track = tracks.track();
        loaded.push(track);
        tasks.set(TASKS[track]);
      }),
    };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ContentService, useValue: content }],
    });
    tracks = TestBed.inject(TrackService);
  });

  const run = (guard: typeof syncTrackGuard, params: Record<string, string>) =>
    TestBed.runInInjectionContext(() =>
      guard(route(params), {} as RouterStateSnapshot),
    ) as Promise<boolean>;

  it('тема чужого трека в адресе переключает трек и ждёт загрузки', async () => {
    expect(tracks.track()).toBe('web');

    await run(syncTrackGuard, { topic: 'kotlin' });

    expect(tracks.track()).toBe('android');
    // Контент дожидается здесь, иначе экран моргнёт пустой колодой.
    expect(loaded).toEqual(['android']);
  });

  it('тема своего трека ничего не перезагружает', async () => {
    await run(syncTrackGuard, { topic: 'angular' });

    expect(tracks.track()).toBe('web');
    expect(loaded).toEqual([]);
  });

  it('неизвестная тема не трогает трек', async () => {
    await run(syncTrackGuard, { topic: 'swift' });

    expect(tracks.track()).toBe('web');
    expect(loaded).toEqual([]);
  });

  it('ссылка на задачу чужого трека находит её и переключает трек', async () => {
    await run(syncTrackForTaskGuard, { id: 'task-kt' });

    expect(tracks.track()).toBe('android');
  });

  it('задача своего трека не вызывает перезагрузку', async () => {
    await run(syncTrackForTaskGuard, { id: 'task-web' });

    expect(tracks.track()).toBe('web');
    expect(loaded).toEqual([]);
  });

  it('ссылка на несуществующую задачу возвращает исходный трек', async () => {
    await run(syncTrackForTaskGuard, { id: 'task-нет-такой' });

    // Иначе опечатка в ссылке уводила бы человека в чужое направление.
    expect(tracks.track()).toBe('web');
  });
});
