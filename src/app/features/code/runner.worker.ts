/// <reference lib="webworker" />

/**
 * Исполнение решения в отдельном потоке.
 *
 * Воркер здесь не ради производительности, а ради живучести вкладки:
 * `while (true) {}` в задаче про event loop — не экзотика, а типичная ошибка,
 * и на главном потоке она вешает приложение намертво. Воркер главный поток
 * не блокирует, и его всегда можно прибить `terminate()`.
 *
 * На вход приходит уже готовый JavaScript: транспиляцию TypeScript делает
 * Monaco на главном потоке — компилятор в нём и так есть, тащить второй
 * в воркер незачем.
 */

export interface RunRequest {
  readonly code: string;
}

export interface RunResult {
  readonly output: string[];
  readonly error: string | null;
}

/** Сколько ждать асинхронный вывод после того, как синхронный код отработал. */
const DRAIN_ROUNDS = 6;
const DRAIN_STEP_MS = 25;

addEventListener('message', (event: MessageEvent<RunRequest>) => {
  void run(event.data.code);
});

async function run(code: string): Promise<void> {
  const output: string[] = [];
  let error: string | null = null;

  const capture =
    (prefix = '') =>
    (...args: unknown[]) =>
      output.push(prefix + args.map(inspect).join(' '));

  // Подменяется именно глобальная консоль: код задачи может звать её
  // откуда угодно — из колбэка таймера, из промиса, из вложенной функции.
  const patched = {
    log: capture(),
    info: capture(),
    warn: capture(),
    error: capture(),
    debug: capture(),
  };
  Object.assign(self, { console: { ...console, ...patched } });

  // Необработанный reject в задаче про промисы — часть ответа, а не сбой.
  addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
    output.push(`Uncaught (in promise) ${inspect((e as PromiseRejectionEvent).reason)}`);
  });

  // Ошибка, брошенная из колбэка таймера, всплывает как событие воркера и без
  // перехвата убила бы весь запуск вместе с уже собранным выводом.
  addEventListener('error', (e) => {
    e.preventDefault();
    output.push(`Uncaught ${inspect((e as ErrorEvent).error ?? (e as ErrorEvent).message)}`);
  });

  try {
    // Строгий режим: без него часть задач про `this` и всплытие ведёт себя
    // не так, как в реальном модуле, и разбор оказался бы враньём.
    const fn = new Function(`"use strict";\n${code}\n//# sourceURL=task.js`);
    fn();
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // Даём отработать микрозадачам и таймерам: почти каждая задача про
  // порядок вывода печатает что-то уже после синхронной части.
  for (let i = 0; i < DRAIN_ROUNDS; i++) {
    await new Promise((resolve) => setTimeout(resolve, DRAIN_STEP_MS));
  }

  const result: RunResult = { output, error };
  postMessage(result);
}

/**
 * Печать значения в стиле консоли: строки верхнего уровня — без кавычек,
 * вложенные — с кавычками. Так же ведут себя devtools и Node, а именно
 * с их выводом человек сверяет ожидания.
 */
function inspect(value: unknown, depth = 0): string {
  if (typeof value === 'string') {
    return depth === 0 ? value : `'${value}'`;
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  if (depth > 3) {
    return '…';
  }
  if (Array.isArray(value)) {
    return `[ ${value.map((item) => inspect(item, depth + 1)).join(', ')} ]`;
  }
  if (value instanceof Map) {
    const items = [...value.entries()]
      .map(([k, v]) => `${inspect(k, depth + 1)} => ${inspect(v, depth + 1)}`)
      .join(', ');
    return `Map(${value.size}) { ${items} }`;
  }
  if (value instanceof Set) {
    return `Set(${value.size}) { ${[...value].map((v) => inspect(v, depth + 1)).join(', ')} }`;
  }
  if (value instanceof Promise) {
    return 'Promise { <pending> }';
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => `${key}: ${inspect(val, depth + 1)}`)
    .join(', ');
  return entries === '' ? '{}' : `{ ${entries} }`;
}
