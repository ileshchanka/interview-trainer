/**
 * Сравнение фактического вывода кода с ожидаемым. Без DOM и без воркера:
 * воркер только добывает строки, решение о правильности принимается здесь.
 */

export interface Verdict {
  readonly passed: boolean;
  readonly expected: readonly string[];
  readonly actual: readonly string[];
  /** Индекс первой разошедшейся строки; `null`, если всё совпало. */
  readonly firstMismatch: number | null;
}

/**
 * Нормализация строки вывода: проверяется знание языка, а не умение угадать
 * формат печати. Поэтому не считаются ошибкой ни кавычки (`'a'` против `"a"`),
 * ни пробелы внутри структур — человек пишет `['a','b']`, а консоль печатает
 * `[ 'a', 'b' ]`, и засчитывать это как расхождение было бы издевательством.
 * Пробелы между словами при этом сохраняются: `console.log('a', 'b')` даёт
 * `a b`, и склеивать их в `ab` нельзя.
 */
function normalize(line: string): string {
  return line
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/'/g, '"')
    .replace(/\s*([[\]{}(),:])\s*/g, '$1');
}

/** Пустые строки в хвосте — не расхождение: лишний перевод строки ничего не значит. */
function trimTail(lines: readonly string[]): string[] {
  const out = [...lines];
  while (out.length > 0 && out[out.length - 1].trim() === '') {
    out.pop();
  }
  return out;
}

export function compareOutput(expected: readonly string[], actual: readonly string[]): Verdict {
  const left = trimTail(expected);
  const right = trimTail(actual);

  let firstMismatch: number | null = null;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const a = left[i] === undefined ? undefined : normalize(left[i]);
    const b = right[i] === undefined ? undefined : normalize(right[i]);
    if (a !== b) {
      firstMismatch = i;
      break;
    }
  }

  return {
    passed: firstMismatch === null,
    expected: left,
    actual: right,
    firstMismatch,
  };
}
