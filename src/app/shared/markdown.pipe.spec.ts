import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  let render: (markdown: string) => string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    render = (markdown) =>
      TestBed.runInInjectionContext(() => {
        const html = new MarkdownPipe().transform(markdown);
        return TestBed.inject(DomSanitizer).sanitize(1, html) ?? '';
      });
  });

  function element(markdown: string): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = render(markdown);
    return host;
  }

  it('блок кода превращается в pre > code', () => {
    const code = element('```kotlin\nval x = 1\n```').querySelector('pre code');
    expect(code).not.toBeNull();
    // Подсветка не смеет менять сам текст: по нему человек читает пример.
    expect(code!.textContent).toBe('val x = 1');
  });

  it('ключевые слова размечаются классами highlight.js', () => {
    const host = element('```kotlin\nval x = 1\n```');
    expect(host.querySelector('.hljs-keyword')?.textContent).toBe('val');
    expect(host.querySelector('.hljs-number')?.textContent).toBe('1');
  });

  it('подсвечиваются все языки корпуса, включая короткие алиасы', () => {
    const samples: Record<string, string> = {
      js: 'const a = 1;',
      ts: 'const a: number = 1;',
      kotlin: 'val a = 1',
      html: '<div id="a"></div>',
      xml: '<manifest package="a" />',
      json: '{ "a": 1 }',
      css: '.a { color: red; }',
      bash: 'echo hi',
      http: 'GET /a HTTP/1.1',
    };
    for (const [lang, code] of Object.entries(samples)) {
      const host = element('```' + lang + '\n' + code + '\n```');
      expect(host.querySelector('[class^="hljs-"]'), lang).not.toBeNull();
    }
  });

  it('незнакомый язык остаётся без разметки, но экранируется', () => {
    const host = element('```text\na < b && c > d\n```');
    expect(host.querySelector('[class^="hljs-"]')).toBeNull();
    expect(host.querySelector('pre code')!.textContent).toBe('a < b && c > d');
  });

  it('угловые скобки в подсвеченном коде не становятся тегами', () => {
    const host = element('```ts\nconst a: Array<string> = [];\n```');
    expect(host.querySelector('pre code')!.textContent).toBe('const a: Array<string> = [];');
    expect(host.querySelector('string')).toBeNull();
  });

  it('инлайновый код подсветку не получает', () => {
    const host = element('Ключевое слово `val` объявляет значение.');
    expect(host.querySelector('code')!.innerHTML).toBe('val');
  });

  it('пустое значение даёт пустую строку', () => {
    expect(render('')).toBe('');
  });
});
