import { describe, expect, it } from 'vitest';
import { TOPICS, Topic } from './models';
import { TOPICS_BY_TRACK, TRACKS, parseTrack, trackOf } from './tracks';

describe('tracks', () => {
  it('каждая тема принадлежит ровно одному треку', () => {
    // Тема без трека нигде не покажется, тема в двух — попадёт в чужую статистику.
    for (const topic of TOPICS) {
      const owners = TRACKS.filter((track) => TOPICS_BY_TRACK[track].includes(topic));
      expect(owners, `тема ${topic}`).toHaveLength(1);
    }
  });

  it('в таблице треков нет тем, которых нет в TOPICS', () => {
    const known = new Set<Topic>(TOPICS);
    for (const track of TRACKS) {
      for (const topic of TOPICS_BY_TRACK[track]) {
        expect(known.has(topic), `тема ${topic}`).toBe(true);
      }
    }
  });

  it('trackOf находит трек темы', () => {
    expect(trackOf('angular')).toBe('web');
    expect(trackOf('coroutines')).toBe('android');
  });

  it('мусор в сохранённом значении не ломает запуск', () => {
    expect(parseTrack('android')).toBe('android');
    expect(parseTrack('ios')).toBe('web');
    expect(parseTrack(null)).toBe('web');
  });
});
