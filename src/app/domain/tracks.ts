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

/** Названия направлений одинаковы на всех языках, поэтому живут здесь, а не в словаре. */
export const TRACK_TITLES: Record<Track, string> = {
  web: 'Web',
  android: 'Android',
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
