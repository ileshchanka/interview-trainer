import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import http from 'highlight.js/lib/languages/http';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

/**
 * Подсветка блоков кода в Markdown корпуса.
 *
 * Список языков закрытый и импортируется поштучно: полный пакет highlight.js
 * тянет ~190 грамматик, а в корпусе встречаются ровно эти — экраны карточек
 * должны оставаться лёгкими, туда намеренно не грузится даже Monaco.
 *
 * Автоопределение (`highlightAuto`) не используется сознательно: инфо-строка
 * у блоков проставлена, а на коротких фрагментах определение ошибается —
 * лучше показать код без цвета, чем покрасить Kotlin как Perl.
 */
for (const [name, language] of [
  ['bash', bash],
  ['css', css],
  ['http', http],
  ['javascript', javascript],
  ['json', json],
  ['kotlin', kotlin],
  ['typescript', typescript],
  ['xml', xml],
] as const) {
  hljs.registerLanguage(name, language);
}

/**
 * HTML подсвеченного кода. Возвращаемая строка уже безопасна: highlight.js
 * экранирует вход сам, а для незнакомого языка экранируем здесь.
 */
export function highlightCode(code: string, lang: string | undefined): string {
  const language = lang?.trim().toLowerCase();
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language }).value;
  }
  return escapeHtml(code);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
