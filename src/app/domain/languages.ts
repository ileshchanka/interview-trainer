/**
 * Языки интерфейса и корпуса.
 *
 * Чистый модуль без Angular, как и остальной `domain/`. Устроен по образцу
 * `tracks.ts`: таблицы плюс разбор сохранённого значения.
 *
 * Язык и трек — разные оси. Трек определяет, *какие* карточки существуют,
 * язык — на каком языке они записаны; `id` у перевода те же, поэтому прогресс
 * в IndexedDB общий и не разъезжается при переключении.
 */

import { TOPICS, Topic } from './models';
import { TRACKS, Track } from './tracks';

export type Lang = 'ru' | 'en';

export const LANGS: readonly Lang[] = ['ru', 'en'] as const;

/** Язык оригинала: на него же падает всё, что ещё не переведено. */
export const DEFAULT_LANG: Lang = 'ru';

/** Подпись в переключателе — каждая на своём языке, как принято. */
export const LANG_TITLES: Record<Lang, string> = {
  ru: 'Русский',
  en: 'English',
};

/** Короткий код для кнопки в шапке: полное название туда не помещается. */
export const LANG_CODES: Record<Lang, string> = {
  ru: 'RU',
  en: 'EN',
};

/**
 * Какие темы уже переведены. Корпус переводится по частям, и держать здесь
 * явную таблицу надёжнее, чем ловить 404 на отсутствующем файле: на GitHub
 * Pages вместо честного 404 приезжает `404.html` из SPA-фолбэка, а JSON.parse
 * на HTML падает совсем другой ошибкой.
 *
 * Это единственное место, где живёт знание «этой темы на языке ещё нет» —
 * как `isRunnable()` в `models.ts` для «Kotlin в браузере не выполняется».
 */
export const TRANSLATED_TOPICS: Record<Lang, readonly Topic[]> = {
  ru: TOPICS,
  en: TOPICS,
};

/**
 * То же для кодовых задач. Ось здесь трек, а не тема: задачи лежат одним
 * файлом на трек, и половину файла перевести нельзя.
 */
export const TRANSLATED_TASKS: Record<Lang, readonly Track[]> = {
  ru: TRACKS,
  en: TRACKS,
};

/** На каком языке фактически лежит тема при запрошенном `lang`. */
export function contentLang(lang: Lang, topic: Topic): Lang {
  return TRANSLATED_TOPICS[lang].includes(topic) ? lang : DEFAULT_LANG;
}

/** То же для файла задач трека. */
export function tasksLang(lang: Lang, track: Track): Lang {
  return TRANSLATED_TASKS[lang].includes(track) ? lang : DEFAULT_LANG;
}

/** Разбор сохранённого значения: чужая строка в localStorage не должна ломать запуск. */
export function parseLang(value: string | null | undefined): Lang {
  return LANGS.includes(value as Lang) ? (value as Lang) : DEFAULT_LANG;
}

/**
 * Язык по настройкам браузера — только для первого запуска, дальше решает
 * выбор человека. `navigator.language` приходит видами `en`, `en-US`, `ru-RU`,
 * поэтому сравнивается префикс, а не строка целиком.
 */
export function preferredLang(tags: readonly string[]): Lang {
  for (const tag of tags) {
    const code = tag.toLowerCase().split('-')[0];
    if (LANGS.includes(code as Lang)) {
      return code as Lang;
    }
  }
  return DEFAULT_LANG;
}

/**
 * Выбор формы существительного при числе.
 *
 * В русском форм три (карточка / карточки / карточек), в английском — две,
 * поэтому вызывающий передаёт столько форм, сколько нужно его языку.
 * До этой функции в шаблонах стояло жёсткое «карточек», и «1 карточек»
 * встречалось на экране колод регулярно.
 */
export function plural(lang: Lang, n: number, forms: readonly string[]): string {
  if (lang === 'en') {
    return forms[Math.abs(n) === 1 ? 0 : 1];
  }
  const abs = Math.abs(n) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) {
    return forms[2];
  }
  if (tail > 1 && tail < 5) {
    return forms[1];
  }
  return forms[tail === 1 ? 0 : 2];
}
