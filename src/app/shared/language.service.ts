import { Injectable, computed, effect, signal } from '@angular/core';
import { Lang, parseLang, preferredLang } from '../domain/languages';
import { MESSAGES } from './i18n/messages';

const STORAGE_KEY = 'interview-trainer.lang';

/**
 * Язык интерфейса и корпуса. Устроен как `ThemeService` и `TrackService`:
 * сигнал плюс localStorage с защитой от приватного режима.
 *
 * Смена языка, в отличие от смены трека, не уводит с текущего экрана: набор
 * карточек тот же, `id` у перевода те же, и все маршруты остаются валидными.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly langSignal = signal<Lang>(read());

  readonly lang = this.langSignal.asReadonly();

  /** Словарь текущего языка целиком: `t().decks.study` в шаблоне. */
  readonly t = computed(() => MESSAGES[this.langSignal()]);

  constructor() {
    // `lang` на <html> нужен не для красоты: по нему браузер переносит слова
    // и выбирает словарь проверки орфографии в поле ответа.
    effect(() => {
      document.documentElement.lang = this.langSignal();
    });
  }

  set(lang: Lang): void {
    if (lang === this.langSignal()) {
      return;
    }
    this.langSignal.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Приватный режим: язык просто не запомнится, ронять приложение незачем.
    }
  }
}

/**
 * Первый запуск — язык берётся из настроек браузера, как тема из системной.
 * Дальше решает сохранённый выбор: он и отличается от `navigator.language`
 * ровно в том случае, когда человек язык менял руками.
 */
function read(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return parseLang(stored);
    }
  } catch {
    // Хранилище недоступно — угадываем по браузеру, как при первом запуске.
  }
  return preferredLang(typeof navigator === 'undefined' ? [] : navigator.languages);
}
