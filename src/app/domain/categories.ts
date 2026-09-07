/**
 * Категории — подтемы внутри одной колоды: «event loop», «замыкания», «Flow».
 *
 * Чистый модуль без Angular, как и остальной `domain/`. Здесь живёт всё знание
 * о том, как выбранные категории попадают в адрес и обратно, — экраны только
 * рисуют список и передают набор номеров.
 *
 * В адресе категории названы **номерами**, а не подписями: подписи переведены
 * («замыкания» → «closures»), и ссылка на подборку разъезжалась бы при смене
 * языка. Порядок карточек в переводе совпадает с оригиналом, поэтому номер —
 * язык-независимый ключ; тот же приём уже применён к номеру вопроса в адресе
 * просмотра.
 */

import { Card, Topic } from './models';

export interface Category {
  /** Номер в списке категорий колоды, считая с единицы, — то же, что в адресе. */
  readonly number: number;
  readonly subtopic: string;
  readonly cards: number;
}

/**
 * Категории колоды в порядке первого появления карточки.
 *
 * Именно первого появления, а не алфавита: в некоторых темах карточки одной
 * подтемы разбросаны по файлу, и порядок в списке должен совпадать с порядком
 * чтения колоды подряд.
 */
export function categoriesOf(cards: readonly Card[], topic: Topic): Category[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (card.topic === topic) {
      counts.set(card.subtopic, (counts.get(card.subtopic) ?? 0) + 1);
    }
  }
  return [...counts].map(([subtopic, count], index) => ({
    number: index + 1,
    subtopic,
    cards: count,
  }));
}

/**
 * Карточки выбранных категорий.
 *
 * Пустой выбор означает «все»: отдельного состояния «ничего не выбрано» нет,
 * пустая колода на экране никому не нужна, а в адресе «все» — это просто
 * отсутствие параметра.
 */
export function filterByCategories(
  cards: readonly Card[],
  topic: Topic,
  selection: ReadonlySet<number>,
): Card[] {
  const pool = cards.filter((card) => card.topic === topic);
  if (selection.size === 0) {
    return pool;
  }
  const chosen = new Set(
    categoriesOf(cards, topic)
      .filter((category) => selection.has(category.number))
      .map((category) => category.subtopic),
  );
  // Номер, которого в колоде нет, — это мусор в адресе, а не «пусто»:
  // иначе присланная ссылка на переехавшую подборку открывала бы ничего.
  return chosen.size === 0 ? pool : pool.filter((card) => chosen.has(card.subtopic));
}

/**
 * Разбор параметра адреса `?cats=1,4,7`.
 *
 * Терпим к мусору: адрес правит человек, и «cats=abc» должен означать «все»,
 * а не сломанный экран.
 */
export function parseCategories(raw: unknown): ReadonlySet<number> {
  if (typeof raw !== 'string') {
    return new Set();
  }
  const numbers = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 1);
  return new Set(numbers);
}

/**
 * Отмечены все категории — то же самое, что не отмечено ничего.
 *
 * Нормализация нужна на входе в адрес: без неё «выбрать всё» руками давало бы
 * длинный `?cats=1,2,3,…`, который к тому же съезжал бы при правке корпуса.
 */
export function normalizeSelection(
  selection: ReadonlySet<number>,
  categories: readonly Category[],
): ReadonlySet<number> {
  const known = [...selection].filter((n) => n >= 1 && n <= categories.length);
  return known.length === categories.length ? new Set() : new Set(known);
}

/**
 * Переключение одной галочки.
 *
 * Пустой фильтр показывает все галочки снятыми, а не отмеченными: иначе
 * снятая галочка означала бы «все, кроме этой», и в адрес пришлось бы писать
 * два десятка номеров вместо одного. Снятая последняя галочка возвращает
 * «все» — колода без категорий пуста и бесполезна.
 */
export function toggleCategory(
  selection: ReadonlySet<number>,
  number: number,
  checked: boolean,
  categories: readonly Category[],
): ReadonlySet<number> {
  const next = new Set(selection);
  if (checked) {
    next.add(number);
  } else {
    next.delete(number);
  }
  return normalizeSelection(next, categories);
}

/** Обратное преобразование. `null` — «все категории», параметр из адреса уходит. */
export function formatCategories(selection: ReadonlySet<number>): string | null {
  if (selection.size === 0) {
    return null;
  }
  return [...selection].sort((a, b) => a - b).join(',');
}
