import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink, convertToParamMap } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { Topic } from '../../domain/models';
import {
  Category,
  categoriesOf,
  filterByCategories,
  formatCategories,
  normalizeSelection,
  parseCategories,
  toggleCategory,
} from '../../domain/categories';
import { TRACK_TITLES } from '../../domain/tracks';
import { dueCount, newCount } from '../../domain/session';
import { streakDays } from '../../domain/stats';
import { isMastered } from '../../domain/srs';
import { LanguageService } from '../../shared/language.service';
import { TrackService } from '../../shared/track.service';

interface DeckView {
  readonly topic: Topic;
  readonly title: string;
  /** Категории колоды со счётчиками — список для раскрывающегося блока. */
  readonly categories: readonly Category[];
  /** Номера выбранных категорий; пусто — вся колода. */
  readonly selection: ReadonlySet<number>;
  /** Значение для ссылок: `null` убирает параметр из адреса. */
  readonly cats: string | null;
  /** Показан ли по этой теме русский оригинал вместо выбранного языка. */
  readonly fallback: boolean;
  readonly total: number;
  readonly due: number;
  readonly fresh: number;
  readonly mastered: number;
  readonly percent: number;
}

@Component({
  selector: 'app-decks-page',
  imports: [
    MatIconModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './decks-page.html',
  styleUrl: './decks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecksPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly tracks = inject(TrackService);
  private readonly languages = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly t = this.languages.t;
  protected readonly trackTitle = computed(() => TRACK_TITLES[this.tracks.track()]);
  protected readonly tasksBlurb = computed(() => this.t().tracks.tasksBlurb[this.tracks.track()]);

  /**
   * Выбранные категории живут в адресе — по параметру на тему (`/decks?js=1,4`).
   * Тот же приём, что в просмотре: «назад» из колоды возвращает сюда с теми же
   * отмеченными категориями, а ссылкой на подборку можно поделиться.
   */
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: convertToParamMap({}),
  });

  /** Какая колода показывает список категорий. Раскрыта всегда одна: список
      длинный, а рядом стоят соседние колоды. */
  protected readonly expanded = signal<Topic | null>(null);

  protected readonly decks = computed<DeckView[]>(() => {
    const titles = this.t().topics;
    const states = this.progress.states();
    const params = this.params();
    const now = Date.now();

    return this.tracks.topics().map((topic) => {
      const all = this.content.cards();
      const categories = categoriesOf(all, topic);
      const selection = normalizeSelection(parseCategories(params.get(topic)), categories);
      const cards = filterByCategories(all, topic, selection);
      const mastered = cards.filter((card) => isMastered(states.get(card.id))).length;
      return {
        topic,
        title: titles[topic],
        categories,
        selection,
        cats: formatCategories(selection),
        fallback: this.content.isFallback(topic),
        total: cards.length,
        due: dueCount(cards, states, now),
        fresh: newCount(cards, states),
        mastered,
        percent: cards.length === 0 ? 0 : Math.round((mastered / cards.length) * 100),
      };
    });
  });

  protected toggleExpanded(topic: Topic): void {
    this.expanded.update((current) => (current === topic ? null : topic));
  }

  protected toggleCategory(deck: DeckView, number: number, checked: boolean): void {
    this.applySelection(
      deck.topic,
      toggleCategory(deck.selection, number, checked, deck.categories),
    );
  }

  protected resetCategories(deck: DeckView): void {
    this.applySelection(deck.topic, new Set());
  }

  private applySelection(topic: Topic, selection: ReadonlySet<number>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      // Остальные колоды свой выбор сохраняют: параметры именованы по теме.
      queryParams: { [topic]: formatCategories(selection) },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Всего к работе прямо сейчас — по нему решается, показывать ли «Повторять всё».
   *
   * Считается по всем карточкам трека, а не по отфильтрованным колодам:
   * «Повторять всё» ведёт в сессию по всем темам сразу, где категории,
   * пронумерованные внутри колоды, ничего не значат.
   */
  protected readonly totalToDo = computed(() => {
    const states = this.progress.states();
    const now = Date.now();
    return this.tracks.topics().reduce((sum, topic) => {
      const cards = this.content.cards().filter((card) => card.topic === topic);
      return sum + dueCount(cards, states, now) + Math.min(newCount(cards, states), 10);
    }, 0);
  });

  protected readonly streak = computed(() => streakDays(this.progress.reviewTimes(), Date.now()));

  protected readonly tasksLeft = computed(() => {
    const solved = this.progress.solvedTasks();
    return this.content.tasks().filter((task) => !solved.has(task.id)).length;
  });
}
