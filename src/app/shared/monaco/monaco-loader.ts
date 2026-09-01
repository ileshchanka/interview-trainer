/**
 * Ленивая загрузка Monaco.
 *
 * Редактор весит несколько мегабайт и нужен ровно на одном экране, поэтому
 * импорт динамический: на карточках его вообще не должно быть в загрузке.
 *
 * Воркеры адресуются относительным путём в `node_modules`, а не голым
 * именем пакета: `new URL(...)` сборщик разбирает статически и понимает
 * только относительные пути — с `'monaco-editor/...'` он молча оставил бы
 * строку как есть, и воркер не запустился бы уже в браузере.
 *
 * Начиная с 0.56 языковые сервисы живут в собственном неймспейсе
 * `monaco.typescript`, а `monaco.languages.typescript` помечен deprecated
 * и в типах пуст — использовать нужно первый.
 */

export type Monaco = typeof import('monaco-editor');

let loading: Promise<Monaco> | undefined;

export function loadMonaco(): Promise<Monaco> {
  loading ??= (async () => {
    (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
      getWorker(_id: string, label: string): Worker {
        if (label === 'typescript' || label === 'javascript') {
          return new Worker(
            new URL(
              '../../../../node_modules/monaco-editor/esm/vs/languages/features/typescript/ts.worker.js',
              import.meta.url,
            ),
            { type: 'module' },
          );
        }
        return new Worker(
          new URL(
            '../../../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
            import.meta.url,
          ),
          { type: 'module' },
        );
      },
    };

    const monaco = await import('monaco-editor');

    for (const defaults of [
      monaco.typescript.typescriptDefaults,
      monaco.typescript.javascriptDefaults,
    ]) {
      defaults.setCompilerOptions({
        target: monaco.typescript.ScriptTarget.ESNext,
        module: monaco.typescript.ModuleKind.ESNext,
        strict: true,
        allowNonTsExtensions: true,
      });
      // Код задачи — фрагмент, а не модуль: подсветка «переменная объявлена
      // дважды» между разными задачами только мешала бы.
      defaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
    }

    return monaco;
  })();

  return loading;
}

/**
 * Транспиляция TypeScript в JavaScript силами самого Monaco.
 *
 * Компилятор уже приехал вместе с редактором, поэтому тащить в проект второй
 * экземпляр `typescript` ради стирания типов — лишние мегабайты. Типы здесь
 * не проверяются намеренно: задача формата «что выведет код» проверяет знание
 * языка, а не готовность кода к компиляции.
 */
export async function transpile(code: string): Promise<string> {
  const monaco = await loadMonaco();
  const uri = monaco.Uri.parse(`inmemory://task/${Date.now()}.ts`);
  const model = monaco.editor.createModel(code, 'typescript', uri);
  try {
    const workerFactory = await monaco.typescript.getTypeScriptWorker();
    const worker = await workerFactory(uri);
    const output = await worker.getEmitOutput(uri.toString());
    return output.outputFiles[0]?.text ?? code;
  } finally {
    model.dispose();
  }
}
