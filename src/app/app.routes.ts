import { Routes } from '@angular/router';
import { syncTrackForTaskGuard, syncTrackGuard } from './shared/track.guard';

/**
 * Каждый экран грузится отдельным чанком: lazy-loading здесь не для галочки —
 * песочница тянет за собой Monaco, и на экране карточек он не нужен.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'decks',
    title: 'Колоды — Interview Trainer',
    loadComponent: () => import('./features/decks/decks-page').then((m) => m.DecksPage),
  },
  {
    path: 'review',
    title: 'Повторение — Interview Trainer',
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
  },
  {
    path: 'review/:topic',
    title: 'Повторение — Interview Trainer',
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
  },
  {
    // Просмотр колоды подряд, без оценок и расписания.
    //
    // Вопрос адресуется своим `id`, а не номером: идентификаторы карточек
    // стабильны, а номер меняется при любой правке корпуса — и присланная
    // ссылка начинала бы открывать чужой вопрос.
    path: 'browse/:topic/:cardId',
    title: 'Все вопросы — Interview Trainer',
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/browse/browse-page').then((m) => m.BrowsePage),
  },
  {
    // Вход без вопроса: экран сам подставит в адрес сохранённую позицию.
    // Маршрут остаётся ради ссылок с экрана колод и коротких ссылок на колоду.
    path: 'browse/:topic',
    title: 'Все вопросы — Interview Trainer',
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/browse/browse-page').then((m) => m.BrowsePage),
  },
  {
    path: 'code',
    title: 'Задачи — Interview Trainer',
    loadComponent: () => import('./features/code/tasks-page').then((m) => m.TasksPage),
  },
  {
    path: 'code/:id',
    title: 'Задача — Interview Trainer',
    canActivate: [syncTrackForTaskGuard],
    loadComponent: () => import('./features/code/task-page').then((m) => m.TaskPage),
  },
  {
    path: 'stats',
    title: 'Прогресс — Interview Trainer',
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
  },
  { path: '**', redirectTo: 'decks' },
];
