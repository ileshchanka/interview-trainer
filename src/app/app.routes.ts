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
    // В адресе стоит постоянный номер вопроса — поле `number` в корпусе,
    // то же самое, что в списке перехода. Он назначается один раз и не
    // меняется, поэтому присланная ссылка ведёт ровно в тот вопрос даже
    // после перестановки колоды. Счётчик «12 / 86» с ним не совпадает
    // намеренно: он показывает позицию в текущей подборке.
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
