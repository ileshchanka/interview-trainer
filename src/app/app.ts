import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ContentService } from './core/content/content.service';
import { LANGS, LANG_CODES, LANG_TITLES, Lang } from './domain/languages';
import { TRACKS, TRACK_TITLES, Track } from './domain/tracks';
import { LanguageService } from './shared/language.service';
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
  private readonly languages = inject(LanguageService);
  private readonly router = inject(Router);
  protected readonly content = inject(ContentService);

  constructor() {
    // Мы подключаем Material Symbols, а `mat-icon` по умолчанию ждёт
    // Material Icons. Без этой строки лигатуры остаются словами на экране.
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }

  protected readonly t = this.languages.t;

  protected readonly allTracks = TRACKS;
  protected readonly trackTitles = TRACK_TITLES;
  protected readonly track = this.tracks.track;

  protected readonly allLangs = LANGS;
  protected readonly langTitles = LANG_TITLES;
  protected readonly langCodes = LANG_CODES;
  protected readonly lang = this.languages.lang;

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

  /**
   * Язык, в отличие от трека, никуда не уводит: набор карточек тот же,
   * `id` у перевода те же, и текущий маршрут остаётся валидным.
   */
  protected selectLang(lang: Lang): void {
    this.languages.set(lang);
  }

  protected readonly themeIcon = computed(
    () =>
      ({ system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' })[this.theme.mode()],
  );

  protected readonly themeLabel = computed(() => this.t().nav.themeNames[this.theme.mode()]);

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
