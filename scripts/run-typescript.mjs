import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { register } from 'ts-node';
import tsconfigPaths from 'tsconfig-paths';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run scripts with TypeScript's JS compiler and Node's built-in test harness.
// No native bundler or lookup of Windows account metadata is required.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const require = createRequire(import.meta.url);
register({ project: path.join(root, 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { rootDir: root, module: 'CommonJS', moduleResolution: 'Node', ignoreDeprecations: '6.0' } });
tsconfigPaths.register({ baseUrl: root, paths: { '@/*': ['src/*'] } });
let entries;
if (mode === 'test') {
  entries = (await readdir(path.join(root, 'tests'))).filter(name => name.endsWith('.test.ts')).map(name => path.join(root, 'tests', name));
} else if (mode === 'db-check' || mode === 'db-verify') {
  entries = [path.join(root, 'scripts', 'check-supabase.ts')];
} else {
  throw new Error('Expected test, db-check, or db-verify');
}
if (mode === 'db-verify') process.argv.push('--write-test');
for (const entry of entries) require(entry);
