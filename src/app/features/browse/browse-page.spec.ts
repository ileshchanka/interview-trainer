import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  let fixture: ComponentFixture<BrowsePage>;
  let page: HTMLElement;

  const cards = signal<readonly Card[]>([card('a'), card('b'), card('c'), card('ng1', 'angular')]);

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContentService, useValue: { cards } },
      ],
    });
    fixture = TestBed.createComponent(BrowsePage);
    fixture.componentRef.setInput('topic', 'kotlin');
    await fixture.whenStable();
    page = fixture.nativeElement as HTMLElement;
  });

  const counter = () => page.querySelector('.counter')?.textContent?.trim();
  const question = () => page.querySelector('.question')?.textContent?.trim();
  const answer = () => page.querySelector('.answer')?.textContent?.trim();
  const button = (label: string) =>
    [...page.querySelectorAll('button')].find((b) => b.textContent?.includes(label));

  it('показывает только карточки своей колоды и их общее число', () => {
    // Четвёртая карточка из другой темы в счётчик попасть не должна.
    expect(counter()).toBe('1 / 3');
    expect(question()).toBe('вопрос a');
  });

  it('«Далее» листает вперёд и обновляет номер', async () => {
    button('Далее')!.click();
    await fixture.whenStable();

    expect(counter()).toBe('2 / 3');
    expect(question()).toBe('вопрос b');
  });

  it('на первой карточке «Назад» недоступна, на последней «Далее» исчезает', async () => {
    expect(button('Назад')!.disabled).toBe(true);

    button('Далее')!.click();
    await fixture.whenStable();
    button('Далее')!.click();
    await fixture.whenStable();

    expect(counter()).toBe('3 / 3');
    expect(button('Далее')).toBeUndefined();
    expect(button('Назад')!.disabled).toBe(false);
  });

  it('ответ скрыт, пока его не показали, и снова скрывается на следующей карточке', async () => {
    expect(answer()).toBeUndefined();

    button('Показать ответ')!.click();
    await fixture.whenStable();
    expect(answer()).toBe('ответ a');

    button('Далее')!.click();
    await fixture.whenStable();
    // Иначе следующий вопрос открывался бы сразу с ответом.
    expect(answer()).toBeUndefined();
  });

  it('пример показывается вместе с ответом и остаётся блоком кода', async () => {
    expect(page.querySelector('.example')).toBeNull();

    button('Показать ответ')!.click();
    await fixture.whenStable();

    // Markdown обязан превратиться в <pre><code>, иначе отступы схлопнутся.
    const code = page.querySelector('.example pre code');
    expect(code?.textContent?.trim()).toBe('val x = 1');
  });

  it('переход по номеру ограничен размером колоды', async () => {
    fixture.componentInstance['go'](99);
    await fixture.whenStable();
    expect(counter()).toBe('3 / 3');

    fixture.componentInstance['go'](-5);
    await fixture.whenStable();
    expect(counter()).toBe('1 / 3');
  });

  it('позиция запоминается и восстанавливается при следующем открытии', async () => {
    button('Далее')!.click();
    await fixture.whenStable();

    const second = TestBed.createComponent(BrowsePage);
    second.componentRef.setInput('topic', 'kotlin');
    await second.whenStable();

    expect(
      (second.nativeElement as HTMLElement).querySelector('.counter')?.textContent?.trim(),
    ).toBe('2 / 3');
  });

  it('стрелки листают колоду', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await fixture.whenStable();
    expect(counter()).toBe('2 / 3');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();
    expect(counter()).toBe('1 / 3');
  });

  it('пробел сначала открывает ответ, потом листает дальше', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await fixture.whenStable();
    expect(answer()).toBe('ответ a');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    await fixture.whenStable();
    expect(counter()).toBe('2 / 3');
  });
});
