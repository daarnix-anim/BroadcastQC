import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

describe('Extension Integrity Tests', () => {
  const rootPackagesDir = path.join(projectRoot, 'packages');
  const extPackagesDir = path.join(projectRoot, 'apps', 'ae-extension', 'packages');

  it('ae-extension packages directory contains all root packages', () => {
    const rootPackages = fs.readdirSync(rootPackagesDir).filter(f => 
      fs.statSync(path.join(rootPackagesDir, f)).isDirectory()
    );

    assert.ok(rootPackages.length > 0, 'Root packages must exist');
    assert.ok(fs.existsSync(extPackagesDir), 'Extension packages dir must exist');

    const extPackages = fs.readdirSync(extPackagesDir).filter(f => 
      fs.statSync(path.join(extPackagesDir, f)).isDirectory()
    );

    for (const pkg of rootPackages) {
      assert.ok(
        extPackages.includes(pkg),
        `Extension packages must include '${pkg}', but found: ${extPackages.join(', ')}`
      );
      assert.ok(
        fs.existsSync(path.join(extPackagesDir, pkg, 'index.js')),
        `Extension package '${pkg}' must contain index.js`
      );
    }
  });

  it('verifies all imports declared in main.js resolve to real files', () => {
    const mainJsPath = path.join(projectRoot, 'apps', 'ae-extension', 'client', 'js', 'main.js');
    assert.ok(fs.existsSync(mainJsPath), 'main.js must exist');

    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;
    const imports = [];
    while ((match = importRegex.exec(mainJsContent)) !== null) {
      imports.push(match[1]);
    }

    assert.ok(imports.length > 0, 'main.js must have imports');

    const clientJsDir = path.dirname(mainJsPath);
    for (const imp of imports) {
      const resolved = path.resolve(clientJsDir, imp);
      assert.ok(
        fs.existsSync(resolved),
        `Import '${imp}' from main.js failed to resolve to existing file: ${resolved}`
      );
    }
  });
});
