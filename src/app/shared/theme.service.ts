import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'interview-trainer.theme';

/**
 * Переключатель темы. По умолчанию — системная: приложением пользуются
 * и днём, и ночью, и навязывать свой выбор незачем.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(read());

  constructor() {
    darkQuery()?.addEventListener('change', (e) => this.systemDark.set(e.matches));

    effect(() => {
      const mode = this.mode();
      const root = document.documentElement;
      if (mode === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', mode);
      }
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Приватный режим: тема просто не запомнится, ронять приложение незачем.
      }
    });
  }

  /**
   * Тёмная ли тема фактически. Нужна тем, кто не умеет читать CSS-переменные,
   * — например, Monaco: у него собственные темы, задаваемые из кода.
   */
  readonly isDark = computed(() => {
    const mode = this.mode();
    return mode === 'system' ? this.systemDark() : mode === 'dark';
  });

  private readonly systemDark = signal(prefersDark());

  toggle(): void {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    this.mode.set(order[(order.indexOf(this.mode()) + 1) % order.length]);
  }
}

/**
 * `matchMedia` есть не везде: в тестовой среде и при серверном рендеринге его
 * нет вовсе, и обращение к нему уронило бы весь инжектор на пустом месте.
 */
function darkQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
}

function prefersDark(): boolean {
  return darkQuery()?.matches ?? false;
}

function read(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}
