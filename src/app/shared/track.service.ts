import { Injectable, computed, signal } from '@angular/core';
import { Topic } from '../domain/models';
import { TOPICS_BY_TRACK, Track, parseTrack } from '../domain/tracks';

const STORAGE_KEY = 'interview-trainer.track';

/**
 * Выбранный трек подготовки. Устроен как `ThemeService`: сигнал плюс
 * localStorage с защитой от приватного режима, где запись бросает исключение.
 */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly trackSignal = signal<Track>(read());

  readonly track = this.trackSignal.asReadonly();

  /** Темы текущего трека — их показывают колоды, задачи и статистика. */
  readonly topics = computed<readonly Topic[]>(() => TOPICS_BY_TRACK[this.trackSignal()]);

  set(track: Track): void {
    if (track === this.trackSignal()) {
      return;
    }
    this.trackSignal.set(track);
    try {
      localStorage.setItem(STORAGE_KEY, track);
    } catch {
      // Приватный режим: трек просто не запомнится, ронять приложение незачем.
    }
  }
}

function read(): Track {
  try {
    return parseTrack(localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseTrack(null);
  }
}
