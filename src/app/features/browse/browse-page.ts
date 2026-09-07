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
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { Card, Topic } from '../../domain/models';
import { LanguageService } from '../../shared/language.service';
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
  private readonly router = inject(Router);
  private readonly languages = inject(LanguageService);

  protected readonly t = this.languages.t;

  readonly topic = input.required<Topic>();
  /**
   * Номер вопроса из адреса, считая с единицы, — тот же, что в счётчике.
   * Пусто — зашли по короткой ссылке на колоду или номер не разобрался.
   */
  readonly position = input<number | undefined, unknown>(undefined, {
    alias: 'number',
    transform: (raw) => {
      const value = Number(raw);
      return Number.isInteger(value) && value >= 1 ? value : undefined;
    },
  });

  protected readonly revealed = signal(false);

  protected readonly title = computed(() => this.t().topics[this.topic()]);

  /** Колода показана в оригинале, потому что на выбранный язык её ещё не перевели. */
  protected readonly fallback = computed(() => this.content.isFallback(this.topic()));

  /** Карточки идут в порядке файла: он сгруппирован по подтемам и читается подряд. */
  protected readonly cards = computed<readonly Card[]>(() =>
    this.content.cards().filter((card) => card.topic === this.topic()),
  );

  protected readonly total = computed(() => this.cards().length);

  /**
   * Текущая позиция выводится из адреса, а не хранится рядом с ним: два
   * источника истины пришлось бы синхронизировать в обе стороны, и кнопка
   * «назад» в браузере расходилась бы с содержимым экрана.
   *
   * Адрес без номера откатывается к сохранённой позиции, номер за границами
   * колоды — к ближайшему краю; сам адрес поправит эффект ниже.
   */
  protected readonly index = computed(() => {
    const total = this.cards().length;
    if (total === 0) {
      return 0;
    }
    const fromUrl = this.position();
    return fromUrl === undefined ? this.savedIndex() : Math.min(fromUrl - 1, total - 1);
  });

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

  /**
   * Позиция запоминается по колоде: чтение сотни карточек за один присест
   * никто не заканчивает, и возвращаться каждый раз к первой — издевательство.
   *
   * Хранится `id`, а не номер из адреса: номер съезжает при перестановке
   * корпуса, и человек возвращался бы не туда, где остановился.
   */
  private readonly savedIndex = computed(() => {
    const cards = this.cards();
    const saved = readPosition(this.topic());
    const byId = cards.findIndex((card) => card.id === saved);
    return byId >= 0 ? byId : 0;
  });

  constructor() {
    // Адрес всегда называет показанный вопрос: и когда номера не было вовсе,
    // и когда он оказался за границами колоды.
    effect(() => {
      const index = this.index();
      if (this.cards().length === 0 || this.position() === index + 1) {
        return;
      }
      untracked(() => this.show(index));
    });

    effect(() => {
      const card = this.current();
      if (card !== undefined) {
        savePosition(
          untracked(() => this.topic()),
          card.id,
        );
      }
    });

    // Новый вопрос всегда открывается закрытым, иначе переход по «Далее»
    // или по ссылке сразу показывал бы ответ.
    effect(() => {
      this.current()?.id;
      untracked(() => this.revealed.set(false));
    });
  }

  protected go(index: number): void {
    const total = this.total();
    if (total === 0) {
      return;
    }
    this.show(Math.min(Math.max(index, 0), total - 1));
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
   * Листание заменяет запись в истории, а не добавляет: иначе «назад» после
   * сотни вопросов пришлось бы жать сотню раз, чтобы выйти к колодам.
   */
  private show(index: number): void {
    void this.router.navigate(['/browse', this.topic(), index + 1], { replaceUrl: true });
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

/**
 * Хранится идентификатор, а не номер: номер съезжает при любой перестановке
 * корпуса, и человек возвращался бы не туда, где остановился.
 */
function readPosition(topic: Topic): string | null {
  try {
    return localStorage.getItem(`${POSITION_KEY}.${topic}`);
  } catch {
    return null;
  }
}

function savePosition(topic: Topic, cardId: string): void {
  try {
    localStorage.setItem(`${POSITION_KEY}.${topic}`, cardId);
  } catch {
    // Приватный режим: позиция просто не запомнится.
  }
}
