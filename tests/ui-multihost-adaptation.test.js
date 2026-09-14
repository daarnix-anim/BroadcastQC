import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper function that mirrors client/js/main.js host adaptation logic
function getHostAdaptationConfig(appId, appVersion = '2026') {
    const isPPro = (appId === 'PPRO');
    return {
        isPPro,
        appId: isPPro ? 'PPRO' : 'AEFT',
        appName: isPPro ? 'Premiere Pro' : 'After Effects',
        appBadgeText: isPPro ? `Premiere Pro ${appVersion}` : `After Effects ${appVersion}`,
        itemUnitName: isPPro ? 'клип/субтитр' : 'слой',
        containerName: isPPro ? 'секвенция' : 'композиция',
        runButtonSingleText: isPPro ? 'Запустить проверку секвенции' : 'Запустить проверку композиции',
        runButtonAllText: isPPro ? 'Запустить проверку всех секвенций' : 'Запустить проверку всего проекта',
        noActiveContainerText: isPPro ? 'Нет активной секвенции' : 'Нет активной композиции',
        isAutoPlateSupported: !isPPro,
        autoPlateNotice: isPPro
            ? 'Функция адаптивной шейповой плашки (Auto-Plate) использует движок выражений After Effects. Доступна при запуске Broadcast QC в After Effects.'
            : null
    };
}

describe('UI Multi-Host Adaptation', () => {
    it('provides correct configuration for Adobe Premiere Pro (PPRO)', () => {
        const config = getHostAdaptationConfig('PPRO', '2026');

        assert.equal(config.isPPro, true);
        assert.equal(config.appName, 'Premiere Pro');
        assert.equal(config.appBadgeText, 'Premiere Pro 2026');
        assert.equal(config.containerName, 'секвенция');
        assert.equal(config.runButtonSingleText, 'Запустить проверку секвенции');
        assert.equal(config.runButtonAllText, 'Запустить проверку всех секвенций');
        assert.equal(config.noActiveContainerText, 'Нет активной секвенции');
        assert.equal(config.isAutoPlateSupported, false);
        assert.ok(config.autoPlateNotice.includes('After Effects'));
    });

    it('provides correct configuration for Adobe After Effects (AEFT)', () => {
        const config = getHostAdaptationConfig('AEFT', '2026.2');

        assert.equal(config.isPPro, false);
        assert.equal(config.appName, 'After Effects');
        assert.equal(config.appBadgeText, 'After Effects 2026.2');
        assert.equal(config.containerName, 'композиция');
        assert.equal(config.runButtonSingleText, 'Запустить проверку композиции');
        assert.equal(config.runButtonAllText, 'Запустить проверку всего проекта');
        assert.equal(config.noActiveContainerText, 'Нет активной композиции');
        assert.equal(config.isAutoPlateSupported, true);
        assert.equal(config.autoPlateNotice, null);
    });
});
