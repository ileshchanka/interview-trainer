import { Routes } from '@angular/router';

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
    loadComponent: () => import('./features/review/review-page').then((m) => m.ReviewPage),
  },
  {
    path: 'code',
    title: 'Задачи — Interview Trainer',
    loadComponent: () => import('./features/code/tasks-page').then((m) => m.TasksPage),
  },
  {
    path: 'code/:id',
    title: 'Задача — Interview Trainer',
    loadComponent: () => import('./features/code/task-page').then((m) => m.TaskPage),
  },
  {
    path: 'stats',
    title: 'Прогресс — Interview Trainer',
    loadComponent: () => import('./features/stats/stats-page').then((m) => m.StatsPage),
  },
  { path: '**', redirectTo: 'decks' },
];
