import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../core/content/content.service';
import { ProgressStore } from '../../core/storage/progress.store';
import { TOPIC_TITLES, isRunnable } from '../../domain/models';
import { Verdict, compareOutput } from '../../domain/verdict';
import { CodeEditor } from '../../shared/monaco/code-editor';
import { MarkdownPipe } from '../../shared/markdown.pipe';
import { CodeRunner } from './code-runner.service';

@Component({
  selector: 'app-task-page',
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    CodeEditor,
    MarkdownPipe,
  ],
  templateUrl: './task-page.html',
  styleUrl: './task-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPage {
  private readonly content = inject(ContentService);
  private readonly progress = inject(ProgressStore);
  private readonly runner = inject(CodeRunner);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly titles = TOPIC_TITLES;
  protected readonly prediction = signal('');
  protected readonly running = signal(false);
  protected readonly verdict = signal<Verdict | null>(null);
  protected readonly runError = signal<string | null>(null);
  protected readonly revealed = signal(false);

  protected readonly task = computed(() => this.content.taskById().get(this.id()));

  private readonly editor = viewChild(CodeEditor);

  /** Код в редакторе: правки нужны, чтобы можно было поэкспериментировать. */
  protected readonly code = signal<string | null>(null);

  protected readonly editorLanguage = computed(() => {
    switch (this.task()?.language) {
      case 'ts':
        return 'typescript';
      case 'kotlin':
        return 'kotlin';
      default:
        return 'javascript';
    }
  });

  /**
   * Исполняется ли код задачи прямо в браузере. Для Kotlin — нет, и экран
   * говорит об этом прямо: редактор только для чтения, кнопка называется
   * «Показать ответ», а вердикт сверяется с ответом, записанным в задаче
   * и проверенным `npm run verify:content` на настоящем компиляторе.
   */
  protected readonly runnable = computed(() => {
    const task = this.task();
    return task === undefined || isRunnable(task.language);
  });

  protected readonly nextTaskId = computed(() => {
    const tasks = this.content.tasks();
    const index = tasks.findIndex((task) => task.id === this.id());
    return index >= 0 && index + 1 < tasks.length ? tasks[index + 1].id : null;
  });

  constructor() {
    // Компонент переиспользуется между задачами: без сброса на смену id
    // следующая задача открылась бы с чужим ответом и чужим вердиктом.
    effect(() => {
      this.id();
      untracked(() => this.reset());
    });
  }

  protected onCodeChange(code: string): void {
    this.code.set(code);
    // Правка кода делает прежний вердикт неправдой — он относился к другому коду.
    this.verdict.set(null);
  }

  /**
   * Проверка идёт против фактического вывода, а не против записанного в JSON:
   * источник истины — то, что реально печатает движок.
   *
   * Если код вовсе не выполнился (человек правил его в редакторе и получил
   * бесконечный цикл или синтаксическую ошибку), вердикт не выносится вообще.
   * Подставлять сюда записанный в задаче ответ нельзя: он относится к
   * исходному коду, и совпадение с ним объявляло бы «Верно» за код, который
   * вообще не запустился.
   */
  protected async check(): Promise<void> {
    const task = this.task();
    if (task === undefined || this.running()) {
      return;
    }

    this.running.set(true);
    this.runError.set(null);

    if (!isRunnable(task.language)) {
      // Запускать нечем: сверяем предсказание с записанным выводом.
      const verdict = compareOutput(task.expectedOutput, splitLines(this.prediction()));
      this.verdict.set(verdict);
      this.revealed.set(true);
      this.progress.recordAttempt(task.id, verdict.passed);
      this.running.set(false);
      return;
    }

    // Ветка выше гарантирует исполняемый язык, но компилятор об этом не знает.
    const language = task.language === 'ts' ? 'ts' : 'js';
    const result = await this.runner.run(this.code() ?? task.code, language);
    this.runError.set(result.error);

    if (result.error !== null && result.output.length === 0) {
      this.verdict.set(null);
      this.revealed.set(false);
      this.running.set(false);
      return;
    }

    const verdict = compareOutput(result.output, splitLines(this.prediction()));
    this.verdict.set(verdict);
    this.revealed.set(true);
    this.progress.recordAttempt(task.id, verdict.passed);
    this.running.set(false);
  }

  protected async goNext(): Promise<void> {
    const next = this.nextTaskId();
    await this.router.navigate(next === null ? ['/code'] : ['/code', next]);
  }

  /** «Ещё раз» возвращает и ответ, и код к исходному состоянию задачи. */
  protected retry(): void {
    const task = this.task();
    this.reset();
    if (task !== undefined) {
      this.editor()?.setValue(task.code);
    }
  }

  private reset(): void {
    this.prediction.set('');
    this.verdict.set(null);
    this.runError.set(null);
    this.revealed.set(false);
    this.code.set(null);
  }
}

/** Хвостовые пустые строки отбросит уже `compareOutput` — здесь только разбор. */
function splitLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim());
}
