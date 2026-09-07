import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContentService } from '../../core/content/content.service';
import { Card } from '../../domain/models';
import { BrowsePage } from './browse-page';

function card(id: string, topic: Card['topic'] = 'kotlin'): Card {
  return {
    id,
    topic,
    subtopic: 'основы',
    question: `вопрос ${id}`,
    answer: `ответ ${id}`,
    example: '```kotlin\nval x = 1\n```',
  };
}

describe('BrowsePage', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  const cards = signal<readonly Card[]>([card('a'), card('b'), card('c'), card('ng1', 'angular')]);

  /** Переход по адресу: harness создаётся один раз за тест, дальше только навигация. */
  async function open(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    // Экран может поправить адрес сам — дожидаемся и этой навигации тоже.
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(
          [
            { path: 'browse/:topic/:cardId', component: BrowsePage },
            { path: 'browse/:topic', component: BrowsePage },
          ],
          withComponentInputBinding(),
        ),
        { provide: ContentService, useValue: { cards } },
      ],
    });
    harness = await RouterTestingHarness.create('/browse/kotlin/a');
    page = harness.routeNativeElement as HTMLElement;
  });

  const url = () => TestBed.inject(Router).url;
  const counter = () => page.querySelector('.counter')?.textContent?.trim();
  const question = () => page.querySelector('.question')?.textContent?.trim();
  const answer = () => page.querySelector('.answer')?.textContent?.trim();
  const button = (label: string) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

  const click = async (label: string) => {
    button(label)!.click();
    await harness.fixture.whenStable();
  };

  const press = async (key: string) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    await harness.fixture.whenStable();
  };

  it('показывает только карточки своей колоды и их общее число', () => {
    // Четвёртая карточка из другой темы в счётчик попасть не должна.
    expect(counter()).toBe('1 / 3');
    expect(question()).toBe('вопрос a');
  });

  it('открывает вопрос, названный в адресе', async () => {
    await open('/browse/kotlin/c');

    expect(question()).toBe('вопрос c');
    expect(counter()).toBe('3 / 3');
  });

  it('«Далее» листает вперёд и обновляет номер и адрес', async () => {
    await click('Далее');

    expect(counter()).toBe('2 / 3');
    expect(question()).toBe('вопрос b');
    expect(url()).toBe('/browse/kotlin/b');
  });

  it('адрес без вопроса дополняется идентификатором', async () => {
    await open('/browse/kotlin');

    expect(question()).toBe('вопрос a');
    expect(url()).toBe('/browse/kotlin/a');
  });

  it('ссылка на удалённый вопрос открывает начало колоды, а не пустой экран', async () => {
    await open('/browse/kotlin/kt-которого-нет');

    expect(question()).toBe('вопрос a');
    expect(url()).toBe('/browse/kotlin/a');
  });

  it('на первой карточке «Назад» недоступна, на последней «Далее» исчезает', async () => {
    expect(button('Назад')!.disabled).toBe(true);

    await click('Далее');
    await click('Далее');

    expect(counter()).toBe('3 / 3');
    expect(button('Далее')).toBeUndefined();
    expect(button('Назад')!.disabled).toBe(false);
  });

  it('ответ скрыт, пока его не показали, и снова скрывается на следующей карточке', async () => {
    expect(answer()).toBeUndefined();

    await click('Показать ответ');
    expect(answer()).toBe('ответ a');

    await click('Далее');
    // Иначе следующий вопрос открывался бы сразу с ответом.
    expect(answer()).toBeUndefined();
  });

  it('пример показывается вместе с ответом и остаётся блоком кода', async () => {
    expect(page.querySelector('.example')).toBeNull();

    await click('Показать ответ');

    // Markdown обязан превратиться в <pre><code>, иначе отступы схлопнутся.
    const code = page.querySelector('.example pre code');
    expect(code?.textContent?.trim()).toBe('val x = 1');
  });

  it('переход по номеру ограничен размером колоды', async () => {
    harness.routeDebugElement!.componentInstance['go'](99);
    await harness.fixture.whenStable();
    expect(counter()).toBe('3 / 3');

    harness.routeDebugElement!.componentInstance['go'](-5);
    await harness.fixture.whenStable();
    expect(counter()).toBe('1 / 3');
  });

  it('позиция запоминается по идентификатору и восстанавливается при входе без него', async () => {
    await click('Далее');

    await open('/browse/kotlin');

    expect(counter()).toBe('2 / 3');
    expect(url()).toBe('/browse/kotlin/b');
  });

  it('стрелки листают колоду', async () => {
    await press('ArrowRight');
    expect(counter()).toBe('2 / 3');

    await press('ArrowLeft');
    expect(counter()).toBe('1 / 3');
  });

  it('пробел сначала открывает ответ, потом листает дальше', async () => {
    await press(' ');
    expect(answer()).toBe('ответ a');

    await press(' ');
    expect(counter()).toBe('2 / 3');
  });
});
