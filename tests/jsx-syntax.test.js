import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('JSX / ExtendScript Syntax Integrity', () => {
  const jsxPath = path.resolve(__dirname, '../apps/ae-extension/host/index.jsx');

  it('verifies apps/ae-extension/host/index.jsx exists and has valid syntax', () => {
    assert.ok(fs.existsSync(jsxPath), `File not found: ${jsxPath}`);
    const code = fs.readFileSync(jsxPath, 'utf8');

    // ExtendScript is ES3 compatible; any standard JS syntax error (like unclosed braces)
    // will fail vm.Script compilation.
    assert.doesNotThrow(() => {
      new vm.Script(code, { filename: 'index.jsx' });
    }, 'index.jsx must be syntactically valid JavaScript/ExtendScript');
  });
});
