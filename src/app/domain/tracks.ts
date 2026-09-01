/**
 * Треки подготовки — независимые наборы тем.
 *
 * Чистый модуль без Angular, как и остальной `domain/`: он описывает только
 * то, какие темы к какому направлению относятся. Загрузка контента, экраны
 * и переключатель опираются на эти таблицы, чтобы список тем не пришлось
 * повторять в каждом из них.
 */

import { Topic } from './models';

export type Track = 'web' | 'android';

export const TRACKS: readonly Track[] = ['web', 'android'] as const;

export const DEFAULT_TRACK: Track = 'web';

export const TRACK_TITLES: Record<Track, string> = {
  web: 'Web',
  android: 'Android',
};

/** Подпись для переключателя: одного слова «Web» мало, чтобы понять состав. */
export const TRACK_SUBTITLES: Record<Track, string> = {
  web: 'JavaScript · TypeScript · Angular',
  android: 'Kotlin · Android SDK · Compose · корутины',
};

/**
 * Чем заняты кодовые задачи трека. Текст разный не для красоты: в вебе код
 * действительно исполняется, а в андроид-треке — нет, и обещать обратное
 * нельзя.
 */
export const TRACK_TASKS_BLURB: Record<Track, string> = {
  web: '«Что выведет этот код» — event loop, this, замыкания, приведение типов и дженерики. Код запускается прямо в браузере, вывод сверяется с фактическим.',
  android:
    '«Что выведет этот код» — корутины и Flow, отмена, scope-функции, data-классы и статическая диспетчеризация. Kotlin в браузере не выполняется: ответ сверяется с записанным, а тот проверен настоящим компилятором при сборке.',
};

export const TOPICS_BY_TRACK: Record<Track, readonly Topic[]> = {
  web: ['js', 'ts', 'angular'],
  android: ['kotlin', 'android', 'compose', 'coroutines'],
};

/** К какому треку относится тема. */
export function trackOf(topic: Topic): Track {
  return TOPICS_BY_TRACK.android.includes(topic) ? 'android' : 'web';
}

/** Разбор сохранённого значения: чужая строка в localStorage не должна ломать запуск. */
export function parseTrack(value: string | null | undefined): Track {
  return TRACKS.includes(value as Track) ? (value as Track) : DEFAULT_TRACK;
}
