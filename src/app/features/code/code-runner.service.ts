import { Injectable } from '@angular/core';
import { transpile } from '../../shared/monaco/monaco-loader';
import type { RunRequest, RunResult } from './runner.worker';

/**
 * Запуск решения: транспиляция (для TypeScript) и исполнение в воркере
 * под жёстким таймаутом.
 */
@Injectable({ providedIn: 'root' })
export class CodeRunner {
  /**
   * Потолок на одну задачу. Секунды хватает с запасом — задачи короткие,
   * а всё, что дольше, почти наверняка бесконечный цикл.
   */
  private readonly timeoutMs = 3000;

  async run(code: string, language: 'js' | 'ts'): Promise<RunResult> {
    const javascript = language === 'ts' ? await transpile(code) : code;
    return this.execute(javascript);
  }

  private execute(code: string): Promise<RunResult> {
    return new Promise<RunResult>((resolve) => {
      const worker = new Worker(new URL('./runner.worker', import.meta.url), { type: 'module' });

      const timer = setTimeout(() => {
        // Единственный способ остановить `while (true) {}` — убить поток.
        worker.terminate();
        resolve({
          output: [],
          error: `Выполнение прервано через ${this.timeoutMs / 1000} с — похоже на бесконечный цикл.`,
        });
      }, this.timeoutMs);

      worker.onmessage = (event: MessageEvent<RunResult>) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(event.data);
      };

      worker.onerror = (event) => {
        clearTimeout(timer);
        worker.terminate();
        resolve({ output: [], error: event.message || 'Ошибка выполнения' });
      };

      const request: RunRequest = { code };
      worker.postMessage(request);
    });
  }
}
