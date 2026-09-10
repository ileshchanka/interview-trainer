/**
 * Проверка корпуса: структура карточек и фактический вывод кодовых задач.
 *
 * Задачи здесь действительно исполняются — в изолированном контексте Node,
 * с тем же форматированием значений, что и в браузерном воркере. Смысл в том,
 * что ожидаемый вывод в JSON легко разойтись с реальностью: три задачи из
 * первых двадцати восьми были записаны неверно и найдены именно так.
 *
 * Запуск: npm run verify:content
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = (name) => path.join(root, 'public/content', name);
const read = (name) => JSON.parse(readFileSync(content(name), 'utf8'));
const exists = (name) => existsSync(content(name));

/** Темы по трекам — держать синхронно с `src/app/domain/tracks.ts`. */
const TRACKS = {
  web: ['js', 'ts', 'angular', 'interview'],
  android: ['kotlin', 'android', 'compose', 'coroutines'],
};
const TOPICS = new Set(Object.values(TRACKS).flat());

/** Уровни матрицы компетенций — держать синхронно с `src/app/domain/models.ts`. */
const LEVELS = new Set(['L1', 'L2', 'L3', 'L4']);

/** Языки корпуса — держать синхронно с `src/app/domain/languages.ts`. */
const LANGS = ['ru', 'en'];
/**
 * Язык оригинала. Он обязан быть полным: на него падает всё непереведённое,
 * и дыра в нём оставила бы экран пустым. Перевод, наоборот, приходит частями,
 * поэтому отсутствующий файл перевода — не ошибка, а строка в отчёте.
 */
const ORIGIN = 'ru';

/**
 * Библиотека корутин в `kotlinc` не входит, а половина андроид-задач — про них.
 * Джарник кладётся в кэш сборки и скачивается один раз; в репозиторий он
 * не попадает — это артефакт, а не исходник.
 *
 * Константа объявлена здесь, а не рядом с использующей её функцией: `const`
 * попадает во временную мёртвую зону, и вызов до строки объявления падал бы
 * с «Cannot access before initialization».
 */
const COROUTINES_VERSION = '1.10.2';
const problems = [];
const notes = [];

// ── карточки ────────────────────────────────────────────────────────────────
/** Что нашлось на каждом языке: `lang -> { cards, tasks, ids }`. */
const corpus = new Map();

for (const lang of LANGS) {
  const cards = [];
  const missing = [];

  for (const [track, topics] of Object.entries(TRACKS)) {
    for (const topic of topics) {
      const file = `${lang}/${track}/${topic}.json`;
      if (!exists(file)) {
        if (lang === ORIGIN) {
          problems.push(`нет файла ${file} — тема оригинала не может отсутствовать`);
        } else {
          missing.push(topic);
        }
        continue;
      }
      const list = read(file);
      for (const card of list) {
        if (card.topic !== topic) {
          problems.push(`карточка ${card.id}: лежит в ${file}, но тема указана «${card.topic}»`);
        }
      }
      cards.push(...list);
    }
  }

  const tasks = [];
  for (const track of Object.keys(TRACKS)) {
    const file = `${lang}/${track}/tasks.json`;
    if (!exists(file)) {
      if (lang === ORIGIN) {
        problems.push(`нет файла ${file} — задачи оригинала не могут отсутствовать`);
      }
      continue;
    }
    tasks.push(...read(file));
  }

  if (missing.length > 0) {
    notes.push(`Язык «${lang}»: не переведены темы — ${missing.join(', ')}.`);
  }
  corpus.set(lang, { cards, tasks, ids: new Set() });
}

/**
 * Инлайновый код вопроса, без блоков: имя вроде `Array.prototype.map` в строке
 * уместно, а выражение из нескольких операторов — нет: вытянутое в предложение,
 * оно не читается и не подсвечивается.
 */
const INLINE_CODE_LIMIT = 40;

function inlineCode(text) {
  if (typeof text !== 'string') {
    return [];
  }
  const withoutBlocks = text.replace(/```[\s\S]*?```/g, '');
  return [...withoutBlocks.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
}

for (const [lang, set] of corpus) {
  // Уникальность id проверяется внутри языка, а не по всему корпусу: перевод
  // намеренно несёт те же id, что оригинал, — на них завязан прогресс.
  const seen = set.ids;
  const numbers = new Map();
  const label = lang === ORIGIN ? '' : ` [${lang}]`;

  for (const card of set.cards) {
    const where = `карточка ${card.id ?? '(без id)'}${label}`;
    for (const field of ['id', 'topic', 'subtopic', 'question', 'answer']) {
      if (typeof card[field] !== 'string' || card[field].trim() === '') {
        problems.push(`${where}: пустое или отсутствующее поле «${field}»`);
      }
    }
    if (!TOPICS.has(card.topic)) {
      problems.push(`${where}: неизвестная тема «${card.topic}»`);
    }
    // Уровень необязателен — он есть только у карточек из матрицы компетенций,
    // — но если он указан, то одним из четырёх известных значений.
    if (card.level !== undefined && !LEVELS.has(card.level)) {
      problems.push(`${where}: неизвестный уровень «${card.level}»`);
    }
    if (seen.has(card.id)) {
      problems.push(`${where}: повторяющийся id — прогресс двух карточек слился бы в один`);
    }
    seen.add(card.id);

    // Номер стоит в адресе и обязан быть постоянным: он назначается один раз
    // и не переиспользуется. Проверяем, что он есть и уникален внутри темы —
    // съехавшая нумерация означала бы, что присланная ссылка открывает
    // не тот вопрос.
    if (!Number.isInteger(card.number) || card.number < 1) {
      problems.push(`${where}: номер вопроса отсутствует или не целое положительное число`);
    } else {
      const key = `${card.topic}/${card.number}`;
      if (numbers.has(key)) {
        problems.push(`${where}: номер ${card.number} уже занят карточкой ${numbers.get(key)}`);
      } else {
        numbers.set(key, card.id);
      }
    }

    // Многооператорный код в вопросе обязан быть блоком, а не инлайном:
    // вытянутый в строку внутри предложения, он и не читается, и не
    // подсвечивается — инлайновому коду подсветка не полагается.
    for (const fragment of inlineCode(card.question)) {
      const multiStatement = fragment.includes(';');
      // Длинное имя без пробелов — вроде `ExpressionChangedAfterItHasBeenCheckedError` —
      // остаётся именем: в строке предложения ему самое место.
      const longExpression = fragment.length > INLINE_CODE_LIMIT && fragment.includes(' ');
      if (multiStatement || longExpression) {
        problems.push(`${where}: код в вопросе оформлен инлайном — «${fragment}»`);
      }
    }

    // Пример обязан быть блоком кода: без ограждения из трёх обратных кавычек
    // Markdown склеит его в абзац, и отступы с переводами строк потеряются.
    if (card.example !== undefined) {
      if (typeof card.example !== 'string' || !card.example.includes('```')) {
        problems.push(`${where}: пример не оформлен блоком кода`);
      } else if ((card.example.match(/```/g) ?? []).length % 2 !== 0) {
        problems.push(`${where}: в примере незакрытый блок кода`);
      }
    }
  }
}

// ── сверка переводов с оригиналом ───────────────────────────────────────────
// Прогресс в IndexedDB общий для всех языков и привязан к id. Карточка
// с новым id в переводе — это молча потерянный прогресс, и поймать её можно
// только здесь.
const originIds = corpus.get(ORIGIN).ids;
const originNumbers = new Map(corpus.get(ORIGIN).cards.map((card) => [card.id, card.number]));
const originLevels = new Map(corpus.get(ORIGIN).cards.map((card) => [card.id, card.level]));
for (const [lang, set] of corpus) {
  if (lang === ORIGIN) {
    continue;
  }
  for (const id of set.ids) {
    if (!originIds.has(id)) {
      problems.push(`перевод [${lang}]: id «${id}» не встречается в оригинале`);
    }
  }

  // Номер тоже общий для языков: адрес /browse/js/42 обязан открывать один
  // и тот же вопрос независимо от выбранного языка.
  for (const card of set.cards) {
    const origin = originNumbers.get(card.id);
    if (origin !== undefined && origin !== card.number) {
      problems.push(
        `перевод [${lang}]: у карточки «${card.id}» номер ${card.number}, а в оригинале ${origin}`,
      );
    }
    // Уровень не переводится: «L2» одинаково выглядит на всех языках,
    // поэтому расхождение здесь означает опечатку, а не решение переводчика.
    const level = originLevels.get(card.id);
    if (set.ids.has(card.id) && level !== card.level) {
      problems.push(
        `перевод [${lang}]: у карточки «${card.id}» уровень «${card.level}», а в оригинале «${level}»`,
      );
    }
  }
}

const cards = [...corpus.values()].flatMap((set) => set.cards);

// ── кодовые задачи ──────────────────────────────────────────────────────────
// Задачи исполняются на каждом языке отдельно: у перевода свой `expectedOutput`,
// и строковые литералы в коде там тоже переведены.
const tasks = [...corpus].flatMap(([lang, set]) =>
  set.tasks.map((task) => ({
    task,
    lang,
    where: `задача ${task.id ?? '(без id)'}${lang === ORIGIN ? '' : ` [${lang}]`}`,
  })),
);

/** Та же печать значений, что и в `src/app/features/code/runner.worker.ts`. */
function inspect(value, depth = 0) {
  if (typeof value === 'string') return depth === 0 ? value : `'${value}'`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (depth > 3) return '…';
  if (Array.isArray(value)) return `[ ${value.map((i) => inspect(i, depth + 1)).join(', ')} ]`;
  if (value instanceof Map) {
    const items = [...value.entries()]
      .map(([k, v]) => `${inspect(k, depth + 1)} => ${inspect(v, depth + 1)}`)
      .join(', ');
    return `Map(${value.size}) { ${items} }`;
  }
  if (value instanceof Set) {
    return `Set(${value.size}) { ${[...value].map((v) => inspect(v, depth + 1)).join(', ')} }`;
  }
  if (value instanceof Promise) return 'Promise { <pending> }';
  const entries = Object.entries(value)
    .map(([k, v]) => `${k}: ${inspect(v, depth + 1)}`)
    .join(', ');
  return entries === '' ? '{}' : `{ ${entries} }`;
}

/** Та же нормализация, что и в `src/app/domain/verdict.ts`. */
const normalize = (line) =>
  line
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/'/g, '"')
    .replace(/\s*([[\]{}(),:])\s*/g, '$1');

const kotlinTasks = [];

for (const { task, lang, where } of tasks) {
  const seen = corpus.get(lang).ids;
  if (seen.has(task.id)) {
    problems.push(`${where}: id пересекается с карточкой`);
  }
  seen.add(task.id);
  if (!TOPICS.has(task.topic)) {
    problems.push(`${where}: неизвестная тема «${task.topic}»`);
  }
  if (!Array.isArray(task.expectedOutput) || task.expectedOutput.length === 0) {
    problems.push(`${where}: не задан ожидаемый вывод`);
    continue;
  }

  if (task.language === 'kotlin') {
    // Kotlin компилируется одним пакетным вызовом ниже: отдельный `kotlinc`
    // на задачу занимал бы секунды и превращал проверку в минуты ожидания.
    kotlinTasks.push({ task, where });
    continue;
  }

  const output = [];
  const capture = (...args) => output.push(args.map((a) => inspect(a)).join(' '));
  const code =
    task.language === 'ts'
      ? ts.transpileModule(task.code, {
          compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
        }).outputText
      : task.code;

  const sandbox = {
    console: { log: capture, info: capture, warn: capture, error: capture },
    setTimeout,
    queueMicrotask,
    Promise,
  };
  sandbox.globalThis = sandbox;

  try {
    vm.runInNewContext('"use strict";\n' + code, vm.createContext(sandbox));
  } catch (error) {
    problems.push(`${where}: код не выполнился — ${error}`);
    continue;
  }

  // Асинхронный вывод: задачи про event loop печатают уже после синхронной части.
  await new Promise((resolve) => setTimeout(resolve, 200));

  const expected = task.expectedOutput.map(normalize);
  const actual = output.map(normalize);
  if (expected.length !== actual.length || expected.some((line, i) => line !== actual[i])) {
    problems.push(
      `${where}: заявленный вывод расходится с фактическим\n` +
        `    ожидалось: ${JSON.stringify(task.expectedOutput)}\n` +
        `    получено : ${JSON.stringify(output)}`,
    );
  }
}

// ── Kotlin ──────────────────────────────────────────────────────────────────
// В браузере этот код не выполняется никогда, поэтому записанный в JSON вывод
// — единственный источник вердикта для пользователя. Значит, он обязан быть
// правдой: здесь задачи компилируются и запускаются по-настоящему.
if (kotlinTasks.length > 0) {
  await verifyKotlin(kotlinTasks);
}

async function coroutinesJar() {
  const dir = path.join(root, 'node_modules/.cache/kotlin');
  const jar = path.join(dir, `kotlinx-coroutines-core-jvm-${COROUTINES_VERSION}.jar`);
  if (existsSync(jar)) {
    return jar;
  }
  const url =
    'https://repo1.maven.org/maven2/org/jetbrains/kotlinx/kotlinx-coroutines-core-jvm/' +
    `${COROUTINES_VERSION}/kotlinx-coroutines-core-jvm-${COROUTINES_VERSION}.jar`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`не удалось скачать kotlinx-coroutines (${response.status})`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(jar, Buffer.from(await response.arrayBuffer()));
  return jar;
}

async function verifyKotlin(list) {
  if (!hasKotlinc()) {
    notes.push(
      `Kotlin-задач не проверено: ${list.length}. Не найден kotlinc — поставьте его ` +
        '(`brew install kotlin`), иначе ошибки в ответах найдёт только читатель.',
    );
    return;
  }

  let jar;
  try {
    jar = await coroutinesJar();
  } catch (error) {
    notes.push(`Kotlin-задач не проверено: ${list.length}. ${error.message}`);
    return;
  }

  const dir = mkdtempSync(path.join(tmpdir(), 'interview-trainer-kotlin-'));
  try {
    // Каждой задаче — свой файл с уникальным именем функции `main`: так весь
    // корпус собирается одним запуском компилятора вместо N запусков.
    const entries = list.map(({ task, where }, index) => {
      const name = `Task${index}`;
      const file = path.join(dir, `${name}.kt`);
      writeFileSync(file, wrapKotlin(task.code, name));
      return { task, where, name, file };
    });

    execFileSync(
      'kotlinc',
      [
        ...entries.map((e) => e.file),
        '-cp',
        jar,
        '-include-runtime',
        '-nowarn',
        '-d',
        path.join(dir, 'tasks.jar'),
      ],
      { stdio: 'pipe', encoding: 'utf8' },
    );

    for (const { task, where, name } of entries) {
      const mainClass = `${packageOf(name)}.${name}Kt`;
      const run = spawnSync('java', ['-cp', `${path.join(dir, 'tasks.jar')}:${jar}`, mainClass], {
        encoding: 'utf8',
        timeout: 20_000,
      });
      if (run.status !== 0) {
        problems.push(`${where}: код не выполнился — ${run.stderr.trim().split('\n')[0]}`);
        continue;
      }
      const actual = run.stdout
        .replace(/\n$/, '')
        .split('\n')
        .filter((l, i, all) => l !== '' || i < all.length - 1);
      const expected = task.expectedOutput.map(normalize);
      const got = actual.map(normalize);
      if (expected.length !== got.length || expected.some((line, i) => line !== got[i])) {
        problems.push(
          `${where}: заявленный вывод расходится с фактическим\n` +
            `    ожидалось: ${JSON.stringify(task.expectedOutput)}\n` +
            `    получено : ${JSON.stringify(actual)}`,
        );
      }
    }
  } catch (error) {
    const output = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim() || String(error);
    problems.push(
      `Kotlin: компиляция корпуса не удалась\n    ${output.split('\n').slice(0, 12).join('\n    ')}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Задача — это фрагмент, а не файл: у неё нет `main`, а объявления верхнего
 * уровня разных задач столкнулись бы именами. Поэтому каждая получает свой
 * файл и свою функцию с уникальным именем.
 */
function wrapKotlin(code, name) {
  const hasMain = /\bfun\s+main\s*\(/.test(code);
  const body = hasMain ? code : `fun main() {\n${code}\n}\n`;
  // Свой пакет на задачу: объявления верхнего уровня иначе сталкиваются именами.
  // Так столкнулись одноимённые `load` в русской и английской версии одной задачи —
  // они компилируются вместе, и без пакетов это «conflicting overloads».
  return `package ${packageOf(name)}\n\n${body}`;
}

/** Имя пакета для задачи: `Task3` -> `task3`. */
function packageOf(name) {
  return name.toLowerCase();
}

function hasKotlinc() {
  const probe = spawnSync('kotlinc', ['-version'], { stdio: 'ignore' });
  return probe.status === 0;
}

if (problems.length > 0) {
  console.error(`Найдено проблем: ${problems.length}\n`);
  for (const problem of problems) {
    console.error('  ✗ ' + problem);
  }
  process.exit(1);
}

for (const note of notes) {
  console.warn('  ! ' + note);
}

const summary = [...corpus]
  .map(([lang, set]) => `${lang}: ${set.cards.length} карточек, ${set.tasks.length} задач`)
  .join('; ');
console.log(`Корпус в порядке — ${summary}.`);
