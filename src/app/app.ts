import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ContentService } from './core/content/content.service';
import { TRACKS, TRACK_SUBTITLES, TRACK_TITLES, Track } from './domain/tracks';
import { ThemeService } from './shared/theme.service';
import { TrackService } from './shared/track.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly theme = inject(ThemeService);
  private readonly tracks = inject(TrackService);
  private readonly router = inject(Router);
  protected readonly content = inject(ContentService);

  constructor() {
    // Мы подключаем Material Symbols, а `mat-icon` по умолчанию ждёт
    // Material Icons. Без этой строки лигатуры остаются словами на экране.
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }

  protected readonly allTracks = TRACKS;
  protected readonly trackTitles = TRACK_TITLES;
  protected readonly trackSubtitles = TRACK_SUBTITLES;
  protected readonly track = this.tracks.track;

  /**
   * Смена трека уводит на экран колод: маршрут вроде `/review/js` в
   * android-треке дал бы пустую сессию, а `/code/task-…` — «задача не найдена».
   */
  protected async selectTrack(track: Track): Promise<void> {
    if (track === this.track()) {
      return;
    }
    this.tracks.set(track);
    await this.router.navigate(['/decks']);
  }

  protected readonly themeIcon = computed(
    () =>
      ({ system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' })[this.theme.mode()],
  );

  protected readonly themeLabel = computed(
    () => ({ system: 'системная', light: 'светлая', dark: 'тёмная' })[this.theme.mode()],
  );

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
