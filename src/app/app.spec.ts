import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('рисует навигацию по всем разделам', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = [...fixture.nativeElement.querySelectorAll('nav a')].map((a: Element) =>
      a.textContent?.trim(),
    );
    expect(links).toEqual(['Колоды', 'Задачи', 'Прогресс']);
  });
});
