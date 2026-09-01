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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(path.join(root, 'public/content', name), 'utf8'));

const TOPICS = new Set(['js', 'ts', 'angular']);
const problems = [];

// ── карточки ────────────────────────────────────────────────────────────────
const cards = [...read('js.json'), ...read('ts.json'), ...read('angular.json')];

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
}

// ── кодовые задачи ──────────────────────────────────────────────────────────
const tasks = read('code-tasks.json');

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

if (problems.length > 0) {
  console.error(`Найдено проблем: ${problems.length}\n`);
  for (const problem of problems) {
    console.error('  ✗ ' + problem);
  }
  process.exit(1);
}

console.log(`Корпус в порядке: ${cards.length} карточек, ${tasks.length} задач.`);
