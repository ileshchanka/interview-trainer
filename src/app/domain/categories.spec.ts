import { describe, expect, it } from 'vitest';
import {
  categoriesOf,
  filterByCategories,
  formatCategories,
  normalizeSelection,
  parseCategories,
  toggleCategory,
} from './categories';
import { Card, Topic } from './models';

function card(id: string, subtopic: string, topic: Topic = 'js'): Card {
  return { id, topic, subtopic, question: `вопрос ${id}`, answer: `ответ ${id}` };
}

const deck: readonly Card[] = [
  card('a', 'event loop'),
  card('b', 'замыкания'),
  card('c', 'event loop'),
  card('d', 'промисы'),
  card('kt', 'основы', 'kotlin'),
];

describe('categoriesOf', () => {
  it('перечисляет подтемы темы в порядке первого появления', () => {
    expect(categoriesOf(deck, 'js').map((c) => c.subtopic)).toEqual([
      'event loop',
      'замыкания',
      'промисы',
    ]);
  });

  it('нумерует с единицы и считает карточки', () => {
    const [first] = categoriesOf(deck, 'js');
    expect(first).toEqual({ number: 1, subtopic: 'event loop', cards: 2 });
  });

  it('чужие темы в список не попадают', () => {
    expect(categoriesOf(deck, 'kotlin').map((c) => c.subtopic)).toEqual(['основы']);
  });
});

describe('filterByCategories', () => {
  it('пустой выбор означает всю колоду', () => {
    expect(filterByCategories(deck, 'js', new Set()).map((c) => c.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('оставляет карточки выбранных категорий', () => {
    expect(filterByCategories(deck, 'js', new Set([1, 3])).map((c) => c.id)).toEqual([
      'a',
      'c',
      'd',
    ]);
  });

  // Ссылка на подборку могла быть прислана до перестановки корпуса: показать
  // всю колоду честнее, чем пустой экран.
  it('номера за границами колоды не обнуляют выборку', () => {
    expect(filterByCategories(deck, 'js', new Set([99])).map((c) => c.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});

describe('parseCategories', () => {
  it('разбирает список номеров', () => {
    expect([...parseCategories('1,4,7')]).toEqual([1, 4, 7]);
  });

  it('мусор в адресе означает «все»', () => {
    expect(parseCategories('abc').size).toBe(0);
    expect(parseCategories(undefined).size).toBe(0);
    expect(parseCategories('').size).toBe(0);
  });

  it('дубли и нули отбрасываются', () => {
    expect([...parseCategories('2,2,0,-1,3')]).toEqual([2, 3]);
  });
});

describe('formatCategories', () => {
  it('пишет номера по возрастанию', () => {
    expect(formatCategories(new Set([7, 1, 4]))).toBe('1,4,7');
  });

  it('пустой выбор убирает параметр из адреса', () => {
    expect(formatCategories(new Set())).toBeNull();
  });
});

describe('normalizeSelection', () => {
  const categories = categoriesOf(deck, 'js');

  it('выбранные все — то же, что не выбрано ничего', () => {
    expect(normalizeSelection(new Set([1, 2, 3]), categories).size).toBe(0);
  });

  it('несуществующие номера отбрасываются', () => {
    expect([...normalizeSelection(new Set([1, 99]), categories)]).toEqual([1]);
  });
});

describe('toggleCategory', () => {
  const categories = categoriesOf(deck, 'js');

  // Пустой фильтр — это «все», и отметить одну категорию должно давать
  // ровно её, а не «все, кроме неё»: иначе в адрес уезжает два десятка номеров.
  it('первая отмеченная категория сужает колоду до неё одной', () => {
    expect([...toggleCategory(new Set(), 2, true, categories)]).toEqual([2]);
  });

  // Снятая единственная категория — это сброс фильтра: колода без категорий
  // пуста и бесполезна, показывать её нечестнее, чем вернуть всё.
  it('снятая единственная категория сбрасывает фильтр', () => {
    expect(toggleCategory(new Set([2]), 2, false, categories).size).toBe(0);
  });

  it('поставленная галочка добавляет категорию', () => {
    expect([...toggleCategory(new Set([1]), 3, true, categories)]).toEqual([1, 3]);
  });

  it('отмеченные все схлопываются в «все»', () => {
    expect(toggleCategory(new Set([1, 2]), 3, true, categories).size).toBe(0);
  });
});
