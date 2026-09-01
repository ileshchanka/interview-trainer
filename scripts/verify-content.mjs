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
const read = (name) => JSON.parse(readFileSync(path.join(root, 'public/content', name), 'utf8'));

/** Темы по трекам — держать синхронно с `src/app/domain/tracks.ts`. */
const TRACKS = {
  web: ['js', 'ts', 'angular'],
  android: ['kotlin', 'android', 'compose', 'coroutines'],
};
const TOPICS = new Set(Object.values(TRACKS).flat());

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
const cards = Object.entries(TRACKS).flatMap(([track, topics]) =>
  topics.flatMap((topic) => {
    const list = read(`${track}/${topic}.json`);
    for (const card of list) {
      if (card.topic !== topic) {
        problems.push(
          `карточка ${card.id}: лежит в ${track}/${topic}.json, но тема указана «${card.topic}»`,
        );
      }
    }
    return list;
  }),
);

const seen = new Set();
for (const card of cards) {
  const where = `карточка ${card.id ?? '(без id)'}`;
  for (const field of ['id', 'topic', 'subtopic', 'question', 'answer']) {
    if (typeof card[field] !== 'string' || card[field].trim() === '') {
      problems.push(`${where}: пустое или отсутствующее поле «${field}»`);
    }
  }
  if (!TOPICS.has(card.topic)) {
    problems.push(`${where}: неизвестная тема «${card.topic}»`);
  }
  if (seen.has(card.id)) {
    problems.push(`${where}: повторяющийся id — прогресс двух карточек слился бы в один`);
  }
  seen.add(card.id);

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

// ── кодовые задачи ──────────────────────────────────────────────────────────
const tasks = Object.keys(TRACKS).flatMap((track) => read(`${track}/tasks.json`));

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

for (const task of tasks) {
  const where = `задача ${task.id ?? '(без id)'}`;
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
    kotlinTasks.push(task);
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
    const entries = list.map((task, index) => {
      const name = `Task${index}`;
      const file = path.join(dir, `${name}.kt`);
      writeFileSync(file, wrapKotlin(task.code, name));
      return { task, name, file };
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

    for (const { task, name } of entries) {
      const run = spawnSync('java', ['-cp', `${path.join(dir, 'tasks.jar')}:${jar}`, `${name}Kt`], {
        encoding: 'utf8',
        timeout: 20_000,
      });
      if (run.status !== 0) {
        problems.push(`задача ${task.id}: код не выполнился — ${run.stderr.trim().split('\n')[0]}`);
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
          `задача ${task.id}: заявленный вывод расходится с фактическим\n` +
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
  return hasMain ? code : `fun main() {\n${code}\n}\n`;
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

console.log(`Корпус в порядке: ${cards.length} карточек, ${tasks.length} задач.`);
