import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  inject,
  viewChild,
} from '@angular/core';
import { ThemeService } from '../theme.service';
import { loadMonaco } from './monaco-loader';

/**
 * Тонкая обёртка над Monaco.
 *
 * Сторонние Angular-биндинги к редактору регулярно отстают от мажорных
 * версий фреймворка, а всей обёртки здесь — создать редактор, отдать
 * изменения наружу и не забыть `dispose()`.
 */
@Component({
  selector: 'app-code-editor',
  template: '<div class="host" #host></div>',
  styles: `
    :host {
      display: block;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      overflow: hidden;
    }

    .host {
      width: 100%;
      height: 100%;
      min-height: inherit;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeEditor {
  readonly code = input.required<string>();
  readonly language = input<'javascript' | 'typescript'>('javascript');
  readonly readOnly = input(false);
  readonly codeChange = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private editor?: import('monaco-editor').editor.IStandaloneCodeEditor;
  private readonly theme = inject(ThemeService);

  constructor() {
    // Тема редактора задаётся из кода, а не CSS-переменными, поэтому за
    // переключателем в шапке она должна следовать отдельным эффектом.
    effect(() => {
      const dark = this.theme.isDark();
      void loadMonaco().then((monaco) => monaco.editor.setTheme(dark ? 'vs-dark' : 'vs'));
    });

    effect((onCleanup) => {
      const element = this.host().nativeElement;
      const code = this.code();
      const language = this.language();
      const readOnly = this.readOnly();
      let disposed = false;

      void loadMonaco().then((monaco) => {
        if (disposed) {
          return;
        }
        this.editor?.dispose();
        this.editor = monaco.editor.create(element, {
          value: code,
          language,
          readOnly,
          theme: this.theme.isDark() ? 'vs-dark' : 'vs',
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
          tabSize: 2,
          renderLineHighlight: 'none',
          padding: { top: 12, bottom: 12 },
        });
        this.editor.onDidChangeModelContent(() => {
          this.codeChange.emit(this.editor?.getValue() ?? '');
        });
      });

      onCleanup(() => {
        disposed = true;
        this.editor?.getModel()?.dispose();
        this.editor?.dispose();
        this.editor = undefined;
      });
    });
  }

  /** Текущее содержимое редактора — читается перед запуском. */
  value(): string {
    return this.editor?.getValue() ?? this.code();
  }

  /**
   * Вернуть в редактор исходный текст. Через входной сигнал этого не сделать:
   * `code` для одной задачи неизменен, и эффект пересоздания не сработает.
   */
  setValue(code: string): void {
    this.editor?.setValue(code);
  }
}
