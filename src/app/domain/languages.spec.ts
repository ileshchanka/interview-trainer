import { describe, expect, it } from 'vitest';
import { TOPICS, Topic } from './models';
import { Track } from './tracks';
import { contentLang, parseLang, plural, preferredLang, tasksLang } from './languages';

describe('parseLang', () => {
  it('принимает известные языки', () => {
    expect(parseLang('ru')).toBe('ru');
    expect(parseLang('en')).toBe('en');
  });

  it('падает на язык оригинала при мусоре', () => {
    expect(parseLang(null)).toBe('ru');
    expect(parseLang(undefined)).toBe('ru');
    expect(parseLang('')).toBe('ru');
    expect(parseLang('de')).toBe('ru');
  });
});

describe('contentLang', () => {
  it('отдаёт запрошенный язык для переведённой темы', () => {
    for (const topic of TOPICS) {
      expect(contentLang('en', topic)).toBe('en');
    }
  });

  // Сейчас переведены все темы, поэтому ветку фолбэка проверяем темой, которой
  // в таблице нет вовсе: именно так поведёт себя новая тема до перевода.
  it('падает на язык оригинала для темы вне таблицы перевода', () => {
    expect(contentLang('en', 'swift' as Topic)).toBe('ru');
  });

  it('для русского всегда русский', () => {
    expect(contentLang('ru', 'compose')).toBe('ru');
  });
});

describe('tasksLang', () => {
  it('отдаёт язык для трека с переведёнными задачами', () => {
    expect(tasksLang('en', 'web')).toBe('en');
    expect(tasksLang('en', 'android')).toBe('en');
  });

  it('падает на язык оригинала для трека вне таблицы перевода', () => {
    expect(tasksLang('en', 'ios' as Track)).toBe('ru');
  });
});

describe('preferredLang', () => {
  it('узнаёт язык по префиксу тега', () => {
    expect(preferredLang(['en-US'])).toBe('en');
    expect(preferredLang(['ru-RU'])).toBe('ru');
  });

  it('берёт первый поддерживаемый из списка', () => {
    expect(preferredLang(['de', 'fr', 'en'])).toBe('en');
  });

  it('без совпадений — язык оригинала', () => {
    expect(preferredLang([])).toBe('ru');
    expect(preferredLang(['de', 'fr'])).toBe('ru');
  });
});

describe('plural', () => {
  const cards = ['карточка', 'карточки', 'карточек'];

  it('русский: три формы', () => {
    expect(plural('ru', 1, cards)).toBe('карточка');
    expect(plural('ru', 2, cards)).toBe('карточки');
    expect(plural('ru', 5, cards)).toBe('карточек');
    expect(plural('ru', 0, cards)).toBe('карточек');
  });

  it('русский: подростковые числа — всегда третья форма', () => {
    expect(plural('ru', 11, cards)).toBe('карточек');
    expect(plural('ru', 12, cards)).toBe('карточек');
    expect(plural('ru', 14, cards)).toBe('карточек');
  });

  it('русский: сотни считаются по последним двум цифрам', () => {
    expect(plural('ru', 21, cards)).toBe('карточка');
    expect(plural('ru', 22, cards)).toBe('карточки');
    expect(plural('ru', 111, cards)).toBe('карточек');
    expect(plural('ru', 101, cards)).toBe('карточка');
  });

  it('английский: две формы', () => {
    expect(plural('en', 1, ['card', 'cards'])).toBe('card');
    expect(plural('en', 0, ['card', 'cards'])).toBe('cards');
    expect(plural('en', 21, ['card', 'cards'])).toBe('cards');
  });
});
