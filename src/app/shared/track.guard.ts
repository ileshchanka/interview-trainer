import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ContentService } from '../core/content/content.service';
import { TOPICS, Topic } from '../domain/models';
import { TRACKS, trackOf } from '../domain/tracks';
import { TrackService } from './track.service';

/**
 * Переключает трек под тему из адреса.
 *
 * Без этого ссылка на `/browse/kotlin`, открытая при активном веб-треке,
 * показывала бы пустую колоду: контент грузится по одному треку, и чужих
 * карточек в сервисе просто нет. Так ломались и присланная ссылка, и
 * обновление страницы после смены трека.
 *
 * Загрузка ожидается прямо здесь, а не оставляется эффекту в `ContentService`:
 * иначе экран успевает отрисоваться с сообщением «в этой колоде нет карточек»
 * и только потом наполняется.
 */
export const syncTrackGuard: CanActivateFn = async (route) => {
  const topic = route.paramMap.get('topic') as Topic | null;
  if (topic === null || !TOPICS.includes(topic)) {
    return true;
  }

  const tracks = inject(TrackService);
  const target = trackOf(topic);
  if (tracks.track() !== target) {
    tracks.set(target);
    await inject(ContentService).load();
  }
  return true;
};

/**
 * То же самое для ссылки на кодовую задачу, где темы в адресе нет.
 *
 * Идентификатор задачи не говорит о треке, поэтому трек определяется поиском:
 * если в текущем корпусе такой задачи нет, пробуем остальные. Промах стоит
 * одной лишней загрузки контента и случается только по внешней ссылке; зато
 * присланная коллегой задача открывается, а не встречает «задача не найдена».
 */
export const syncTrackForTaskGuard: CanActivateFn = async (route) => {
  const id = route.paramMap.get('id');
  if (id === null) {
    return true;
  }

  const content = inject(ContentService);
  const tracks = inject(TrackService);
  if (content.taskById().has(id)) {
    return true;
  }

  const original = tracks.track();
  for (const track of TRACKS) {
    if (track === original) {
      continue;
    }
    tracks.set(track);
    await content.load();
    if (content.taskById().has(id)) {
      return true;
    }
  }

  // Задачи нет нигде: возвращаем трек, чтобы ссылка с опечаткой не уводила
  // человека в чужое направление подготовки.
  tracks.set(original);
  await content.load();
  return true;
};
