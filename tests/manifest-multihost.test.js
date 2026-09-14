import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Multi-Host Manifest and Package Configuration', () => {
    it('declares both AEFT and PPRO hosts in CSXS/manifest.xml', () => {
        const manifestPath = path.join(rootDir, 'apps', 'ae-extension', 'CSXS', 'manifest.xml');
        assert.ok(fs.existsSync(manifestPath), 'manifest.xml must exist');

        const manifestContent = fs.readFileSync(manifestPath, 'utf8');

        // Verify AEFT host
        const hasAeft = /<Host\s+Name="AEFT"\s+Version="\[18\.0,99\.9\]"\s*\/>/.test(manifestContent);
        assert.ok(hasAeft, 'manifest.xml must contain AEFT host with version [18.0,99.9]');

        // Verify PPRO host
        const hasPpro = /<Host\s+Name="PPRO"\s+Version="\[15\.0,99\.9\]"\s*\/>/.test(manifestContent);
        assert.ok(hasPpro, 'manifest.xml must contain PPRO host with version [15.0,99.9]');
    });

    it('declares Premiere Pro in package.json metadata', () => {
        const packagePath = path.join(rootDir, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        assert.ok(
            pkg.keywords.includes('premiere') || pkg.keywords.includes('premiere-pro'),
            'package.json keywords must include premiere or premiere-pro'
        );
        assert.ok(
            pkg.description.includes('Premiere Pro'),
            'package.json description must mention Premiere Pro'
        );
    });
});
