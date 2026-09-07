import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { LanguageService } from './shared/language.service';

describe('App', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  }

  const links = (fixture: { nativeElement: HTMLElement }) =>
    [...fixture.nativeElement.querySelectorAll('nav a')].map((a: Element) => a.textContent?.trim());

  beforeEach(() => {
    localStorage.clear();
    // Без явного языка он угадывается по браузеру, а в jsdom это `en-US`.
    localStorage.setItem('interview-trainer.lang', 'ru');
  });

  it('рисует навигацию по всем разделам', async () => {
    const fixture = await render();

    expect(links(fixture)).toEqual(['Колоды', 'Задачи', 'Прогресс']);
  });

  it('переключение языка меняет интерфейс на месте, без перезагрузки', async () => {
    const fixture = await render();

    TestBed.inject(LanguageService).set('en');
    await fixture.whenStable();

    expect(links(fixture)).toEqual(['Decks', 'Tasks', 'Progress']);
    expect(document.documentElement.lang).toBe('en');
  });
});
