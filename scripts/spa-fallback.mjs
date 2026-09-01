/**
 * Копия `index.html` под именем `404.html`.
 *
 * GitHub Pages — статический хостинг без правил переписывания: по адресу
 * `/browse/kotlin` он ищет файл и, не найдя, отдаёт свою страницу «File not
 * found». Приложение при этом одностраничное, и такой адрес — не файл,
 * а маршрут. Единственная точка расширения у Pages — `404.html`: он отдаёт
 * его содержимое для любого ненайденного пути (со статусом 404, но браузеру
 * этого достаточно). Внутри лежит то же приложение, оно читает адрес
 * из `location` и открывает нужный экран.
 *
 * Запускается автоматически как `postbuild`, поэтому локальная сборка ведёт
 * себя так же, как задеплоенная.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const browser = join(root, 'dist/interview-trainer/browser');
const index = join(browser, 'index.html');

if (!existsSync(index)) {
  console.error(`spa-fallback: не найден ${index} — сборка не выполнялась?`);
  process.exit(1);
}

copyFileSync(index, join(browser, '404.html'));
console.log('spa-fallback: 404.html создан из index.html');
