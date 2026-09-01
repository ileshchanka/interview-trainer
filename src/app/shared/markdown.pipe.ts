import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Markdown из корпуса вопросов в HTML.
 *
 * `bypassSecurityTrustHtml` здесь оправдан: на вход идёт только собственный
 * контент из `public/content`, который лежит в том же репозитории, что и код.
 * Если когда-нибудь появится пользовательский ввод — санитайзер обязателен.
 */
@Pipe({ name: 'md' })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | undefined): SafeHtml {
    if (!value) {
      return '';
    }
    const html = marked.parse(value, { async: false, gfm: true, breaks: false });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
