import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { Card, GRADES, Grade, TOPIC_TITLES, Topic } from '../../domain/models';
import { SessionQueue, advance, buildSession } from '../../domain/session';
import { initialState, review } from '../../domain/srs';
import { MarkdownPipe } from '../../shared/markdown.pipe';

const GRADE_LABELS: Record<Grade, string> = {
  again: 'Не помню',
  hard: 'Трудно',
  good: 'Помню',
  easy: 'Легко',
};

interface GradeButton {
  readonly grade: Grade;
  readonly label: string;
  readonly hint: string;
  readonly hotkey: string;
}

@Component({
  selector: 'app-review-page',
  imports: [
    MatIconModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MarkdownPipe,
  ],
  templateUrl: './review-page.html',
  styleUrl: './review-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class ReviewPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);

  /** Тема из маршрута; пусто — сессия по всем темам сразу. */
  readonly topic = input<Topic | undefined>(undefined);

  protected readonly queue = signal<SessionQueue>({ pending: [], done: [] });
  protected readonly revealed = signal(false);
  /** Сколько карточек закрыто — очередь этого не помнит, `again` возвращает в неё же. */
  protected readonly answered = signal(0);
  protected readonly planned = signal(0);

  protected readonly topicTitle = computed(() => {
    const topic = this.topic();
    return topic ? TOPIC_TITLES[topic] : 'Все темы';
  });

  protected readonly current = computed<Card | undefined>(() => {
    const id = this.queue().pending[0];
    return id === undefined ? undefined : this.content.cardById().get(id);
  });

  protected readonly finished = computed(() => this.queue().pending.length === 0);

  protected readonly percent = computed(() => {
    const total = this.planned();
    return total === 0 ? 100 : Math.round((this.answered() / total) * 100);
  });

  /** Подписи кнопок с предсказанным интервалом: видно цену каждой оценки. */
  protected readonly buttons = computed<GradeButton[]>(() => {
    const card = this.current();
    if (card === undefined) {
      return [];
    }
    const now = Date.now();
    const state = this.progress.states().get(card.id) ?? initialState(card.id, now);

    return GRADES.map((grade, index) => ({
      grade,
      label: GRADE_LABELS[grade],
      hint: formatInterval(review(state, grade, now).intervalDays),
      hotkey: `${index + 1}`,
    }));
  });

  constructor() {
    // Сессия пересобирается при смене темы в адресе, но не после каждой оценки:
    // иначе только что отвеченная карточка тут же вернулась бы в очередь.
    effect(() => {
      const topic = this.topic();
      const cards = this.content.cards();
      if (cards.length === 0) {
        return;
      }
      // Состояния читаются вне отслеживания: они меняются после каждой оценки,
      // и подписка на них перезапускала бы сессию с первой карточки.
      const states = untracked(() => this.progress.states());
      const queue = buildSession(cards, states, Date.now(), {
        newLimit: 10,
        reviewLimit: 40,
        topic,
      });
      this.queue.set(queue);
      this.planned.set(queue.pending.length);
      this.answered.set(0);
      this.revealed.set(false);
    });
  }

  protected reveal(): void {
    this.revealed.set(true);
  }

  protected grade(grade: Grade): void {
    const card = this.current();
    if (card === undefined || !this.revealed()) {
      return;
    }
    this.progress.grade(card.id, grade);
    this.queue.update((queue) => advance(queue, grade));
    this.answered.update((n) => n + 1);
    this.revealed.set(false);
  }

  /**
   * Горячие клавиши: пробел показывает ответ, 1–4 ставят оценку.
   * Без них сессия из сорока карточек превращается в сорок прицельных кликов.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey || this.finished()) {
      return;
    }
    if (!this.revealed()) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        this.reveal();
      }
      return;
    }
    const index = Number(event.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < GRADES.length) {
      event.preventDefault();
      this.grade(GRADES[index]);
    }
  }
}

/** «через 6 дней» читается лучше, чем «6». */
function formatInterval(days: number): string {
  if (days === 0) {
    return 'сегодня';
  }
  if (days === 1) {
    return 'завтра';
  }
  if (days < 30) {
    return `${days} дн.`;
  }
  const months = Math.round(days / 30);
  return months < 12 ? `${months} мес.` : `${Math.round(days / 365)} г.`;
}
