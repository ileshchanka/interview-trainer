import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked, type Tokens } from 'marked';
import { highlightCode } from './highlight';

/**
 * Markdown из корпуса вопросов в HTML.
 *
 * `bypassSecurityTrustHtml` здесь оправдан: на вход идёт только собственный
 * контент из `public/content`, который лежит в том же репозитории, что и код.
 * Если когда-нибудь появится пользовательский ввод — санитайзер обязателен.
 *
 * Блоки кода рендерятся своим `renderer.code` — с подсветкой из `highlight.ts`;
 * инлайновый `code` остаётся простым текстом, красить одно слово незачем.
 * Парсер создаётся один раз на модуль (и отдельным экземпляром, а не настройкой
 * глобального `marked`): pipe вызывается на каждую карточку.
 */
const parser = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }: Tokens.Code): string {
      return `<pre><code class="hljs">${highlightCode(text, lang)}</code></pre>\n`;
    },
  },
});

@Pipe({ name: 'md' })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | undefined): SafeHtml {
    if (!value) {
      return '';
    }
    const html = parser.parse(value, { async: false });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
