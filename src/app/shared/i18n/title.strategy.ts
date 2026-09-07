import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Messages } from './messages';
import { LanguageService } from '../language.service';

/** Ключ заголовка в словаре — маршрут кладёт его в `data.titleKey`. */
export type TitleKey = keyof Messages['titles'];

/**
 * Заголовок вкладки на языке интерфейса.
 *
 * Штатный `title: 'строка'` в маршруте пришлось заменить ключом: строка
 * фиксируется на этапе описания маршрутов, а язык меняется на лету, уже
 * после того как переход состоялся. Стратегия помнит последний ключ и
 * перевыставляет заголовок при смене языка — без неё вкладка оставалась бы
 * русской до следующей навигации.
 */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly languages = inject(LanguageService);

  private current: TitleKey = 'decks';

  constructor() {
    super();
    effect(() => {
      const t = this.languages.t();
      this.title.setTitle(t.titles[this.current]);
      // Описание в разметке статично и осталось бы русским при английском
      // интерфейсе — а его читает не человек, а поисковик и превью ссылки.
      this.meta.updateTag({ name: 'description', content: t.titles.description });
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.current = titleKeyOf(snapshot) ?? 'decks';
    this.title.setTitle(this.languages.t().titles[this.current]);
  }
}

/** Ключ ищется у самого глубокого маршрута с `titleKey`, как это делает штатный `title`. */
function titleKeyOf(snapshot: RouterStateSnapshot): TitleKey | null {
  let route = snapshot.root;
  let key: TitleKey | null = null;
  for (;;) {
    key = (route.data['titleKey'] as TitleKey | undefined) ?? key;
    const next = route.children.find((child) => child.outlet === 'primary');
    if (next === undefined) {
      return key;
    }
    route = next;
  }
}
