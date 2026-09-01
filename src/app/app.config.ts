import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { ContentService } from './core/content/content.service';
import { ProgressStore } from './core/storage/progress.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Всё состояние на signals, zone.js не нужен: приложение обходится
    // без глобального патчинга асинхронности и стартует заметно легче.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Параметры маршрута приезжают прямо в input() компонента.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    // Контент и прогресс подгружаются до первой отрисовки: иначе экран
    // колод успевает моргнуть нулями и пересчитаться.
    provideAppInitializer(() => {
      const content = inject(ContentService);
      const progress = inject(ProgressStore);
      return Promise.all([content.load(), progress.init()]);
    }),
  ],
};
