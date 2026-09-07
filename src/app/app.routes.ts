import { Routes } from '@angular/router';
import { TitleKey } from './shared/i18n/title.strategy';
import { syncTrackForTaskGuard, syncTrackGuard } from './shared/track.guard';

/**
 * Каждый экран грузится отдельным чанком: lazy-loading здесь не для галочки —
 * песочница тянет за собой Monaco, и на экране карточек он не нужен.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'decks',
    data: { titleKey: 'decks' satisfies TitleKey },
    loadComponent: () => import('./features/decks/decks-page').then((m) => m.DecksPage),
  },
  {
    path: 'review',
    data: { titleKey: 'review' satisfies TitleKey },
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
  },
  {
    path: 'review/:topic',
    data: { titleKey: 'review' satisfies TitleKey },
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
  },
  {
    // Просмотр колоды подряд, без оценок и расписания.
    //
    // В адресе стоит номер вопроса — тот же, что в счётчике «12 / 86» и в
    // списке перехода. Номер привязан к порядку в колоде, а не к карточке,
    // поэтому после правки корпуса присланная ссылка может открыть соседний
    // вопрос; сохранённая позиция от этого не страдает — она хранит `id`.
    path: 'browse/:topic/:number',
    data: { titleKey: 'browse' satisfies TitleKey },
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/browse/browse-page').then((m) => m.BrowsePage),
  },
  {
    // Вход без вопроса: экран сам подставит в адрес сохранённую позицию.
    // Маршрут остаётся ради ссылок с экрана колод и коротких ссылок на колоду.
    path: 'browse/:topic',
    data: { titleKey: 'browse' satisfies TitleKey },
    canActivate: [syncTrackGuard],
    loadComponent: () => import('./features/browse/browse-page').then((m) => m.BrowsePage),
  },
  {
    path: 'code',
    data: { titleKey: 'tasks' satisfies TitleKey },
    loadComponent: () => import('./features/code/tasks-page').then((m) => m.TasksPage),
  },
  {
    path: 'code/:id',
    data: { titleKey: 'task' satisfies TitleKey },
    canActivate: [syncTrackForTaskGuard],
    loadComponent: () => import('./features/code/task-page').then((m) => m.TaskPage),
  },
  {
    path: 'stats',
    data: { titleKey: 'stats' satisfies TitleKey },
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
  },
  { path: '**', redirectTo: 'decks' },
];
