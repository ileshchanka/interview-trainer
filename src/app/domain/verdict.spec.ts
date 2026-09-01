import { describe, expect, it } from 'vitest';
import { compareOutput } from './verdict';

describe('compareOutput', () => {
  it('совпадающий вывод засчитывается', () => {
    const verdict = compareOutput(['1', '2'], ['1', '2']);
    expect(verdict.passed).toBe(true);
    expect(verdict.firstMismatch).toBeNull();
  });

  it('показывает номер первой разошедшейся строки, а не только факт ошибки', () => {
    const verdict = compareOutput(['1', '2', '3'], ['1', '3', '3']);
    expect(verdict.passed).toBe(false);
    expect(verdict.firstMismatch).toBe(1);
  });

  it('нехватка строк — это расхождение, а не совпадение по префиксу', () => {
    expect(compareOutput(['1', '2'], ['1']).firstMismatch).toBe(1);
    expect(compareOutput(['1'], ['1', '2']).firstMismatch).toBe(1);
  });

  it('кавычки и лишние пробелы не считаются ошибкой', () => {
    expect(compareOutput(["'a'"], ['"a"']).passed).toBe(true);
    expect(compareOutput(['{ a: 1 }'], ['{  a:   1 }']).passed).toBe(true);
  });

  it('пробелы внутри массивов и объектов не важны', () => {
    expect(compareOutput(["[ '0', '1' ]"], ["['0','1']"]).passed).toBe(true);
    expect(compareOutput(['{ value: 1, done: false }'], ['{value:1,done:false}']).passed).toBe(
      true,
    );
  });

  it('пробел между отдельными значениями значим', () => {
    // console.log('a', 'b') печатает «a b», и это не то же самое, что «ab».
    expect(compareOutput(['a b'], ['ab']).passed).toBe(false);
  });

  it('пустые строки в хвосте отбрасываются', () => {
    expect(compareOutput(['1'], ['1', '', '  ']).passed).toBe(true);
  });

  it('пустая строка в середине — значимая', () => {
    expect(compareOutput(['1', '', '2'], ['1', '2']).passed).toBe(false);
  });
});
