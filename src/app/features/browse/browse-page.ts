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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { Card, TOPIC_TITLES, Topic } from '../../domain/models';
import { MarkdownPipe } from '../../shared/markdown.pipe';

const POSITION_KEY = 'interview-trainer.browse';

/**
 * Просмотр колоды подряд, без интервального повторения.
 *
 * Отдельный режим, а не настройка экрана повторения: там каждая карточка
 * заканчивается оценкой и меняет расписание, здесь — просто чтение всей
 * колоды по порядку. Смешивать их значило бы либо испортить расписание
 * случайными оценками, либо завести на одном экране два разных набора
 * кнопок и две разные очереди.
 */
@Component({
  selector: 'app-browse-page',
  imports: [
    MatIconModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MarkdownPipe,
  ],
  templateUrl: './browse-page.html',
  styleUrl: './browse-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class BrowsePage {
  private readonly content = inject(ContentService);

  readonly topic = input.required<Topic>();

  protected readonly index = signal(0);
  protected readonly revealed = signal(false);

  protected readonly title = computed(() => TOPIC_TITLES[this.topic()]);

  /** Карточки идут в порядке файла: он сгруппирован по подтемам и читается подряд. */
  protected readonly cards = computed<readonly Card[]>(() =>
    this.content.cards().filter((card) => card.topic === this.topic()),
  );

  protected readonly total = computed(() => this.cards().length);
  protected readonly current = computed<Card | undefined>(() => this.cards()[this.index()]);

  protected readonly percent = computed(() => {
    const total = this.total();
    return total === 0 ? 0 : Math.round(((this.index() + 1) / total) * 100);
  });

  protected readonly hasPrevious = computed(() => this.index() > 0);
  protected readonly hasNext = computed(() => this.index() + 1 < this.total());

  /** Пункты списка перехода: номер плюс сам вопрос, обрезанный до строки. */
  protected readonly jumpItems = computed(() =>
    this.cards().map((card, i) => ({
      index: i,
      label: `${i + 1}. ${plainText(card.question)}`,
    })),
  );

  constructor() {
    // Позиция запоминается по колоде: чтение сотни карточек за один присест
    // никто не заканчивает, и возвращаться каждый раз к первой — издевательство.
    effect(() => {
      const topic = this.topic();
      const total = this.cards().length;
      if (total === 0) {
        return;
      }
      untracked(() => {
        this.index.set(Math.min(readPosition(topic), total - 1));
        this.revealed.set(false);
      });
    });

    effect(() => {
      const topic = untracked(() => this.topic());
      savePosition(topic, this.index());
    });
  }

  protected go(index: number): void {
    const total = this.total();
    if (total === 0) {
      return;
    }
    this.index.set(Math.min(Math.max(index, 0), total - 1));
    this.revealed.set(false);
  }

  protected next(): void {
    this.go(this.index() + 1);
  }

  protected previous(): void {
    this.go(this.index() - 1);
  }

  protected reveal(): void {
    this.revealed.set(true);
  }

  /**
   * Стрелки листают, пробел показывает ответ. Клавиши игнорируются, когда
   * фокус в поле ввода, — иначе выбор в списке перехода листал бы колоду.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previous();
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (this.revealed()) {
          this.next();
        } else {
          this.reveal();
        }
        break;
    }
  }
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  const tag = element?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || element?.isContentEditable === true;
}

/** Markdown в списке перехода не нужен: там одна строка без разметки. */
function plainText(markdown: string): string {
  return markdown
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readPosition(topic: Topic): number {
  try {
    const raw = localStorage.getItem(`${POSITION_KEY}.${topic}`);
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function savePosition(topic: Topic, index: number): void {
  try {
    localStorage.setItem(`${POSITION_KEY}.${topic}`, String(index));
  } catch {
    // Приватный режим: позиция просто не запомнится.
  }
}
