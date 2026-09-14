import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BroadcastQCCore } from '../packages/qc-core/src/index.js';

describe('Premiere Pro Adapter Data Normalization & QC Pipeline', () => {
    // 254016000000 ticks per second in Premiere Pro Time objects
    const TICKS_PER_SECOND = 254016000000;

    function ticksToSeconds(ticks) {
        if (typeof ticks === 'number') {
            return ticks > 1000000 ? ticks / TICKS_PER_SECOND : ticks;
        }
        if (typeof ticks === 'string') {
            const num = Number(ticks);
            return num > 1000000 ? num / TICKS_PER_SECOND : num;
        }
        return 0;
    }

    function normalizePProTrackItem(trackItem, trackIndex, sequence) {
        const inSec = ticksToSeconds(trackItem.inPoint);
        const outSec = ticksToSeconds(trackItem.outPoint);
        const durSec = Math.max(0.1, outSec - inSec);
        const bounds = trackItem.bounds || {
            left: 100,
            top: 800,
            right: 700,
            bottom: 920,
            width: 600,
            height: 120
        };

        return {
            id: `vtrack_${trackIndex}_${trackItem.nodeId || trackItem.name}`,
            index: trackIndex,
            name: trackItem.name || 'Графический титр',
            type: 'graphic',
            text: trackItem.text || '',
            inPoint: inSec,
            outPoint: outSec,
            duration: durSec,
            enabled: !trackItem.disabled,
            locked: false,
            guideLayer: false,
            compId: sequence.id || 1,
            compName: sequence.name || 'Секвенция',
            width: sequence.width || 1920,
            height: sequence.height || 1080,
            bounds: bounds,
            samples: [
                {
                    time: inSec,
                    position: [sequence.width / 2, sequence.height / 2],
                    scale: [100, 100],
                    opacity: 100,
                    rotation: 0,
                    compAABB: bounds,
                    text: trackItem.text || ''
                },
                {
                    time: (inSec + outSec) / 2,
                    position: [sequence.width / 2, sequence.height / 2],
                    scale: [100, 100],
                    opacity: 100,
                    rotation: 0,
                    compAABB: bounds,
                    text: trackItem.text || ''
                }
            ]
        };
    }

    function normalizePProCaptionItem(captionItem, trackIndex, sequence) {
        const inSec = ticksToSeconds(captionItem.inPoint);
        const outSec = ticksToSeconds(captionItem.outPoint);
        const durSec = Math.max(0.1, outSec - inSec);
        const bounds = captionItem.bounds || {
            left: 192,
            top: 920,
            right: 1728,
            bottom: 1010,
            width: 1536,
            height: 90
        };

        return {
            id: `caption_${trackIndex}_${captionItem.id || Math.random()}`,
            index: trackIndex,
            name: `Субтитр [${inSec.toFixed(2)}s - ${outSec.toFixed(2)}s]`,
            type: 'caption',
            isCaption: true,
            text: captionItem.text || '',
            inPoint: inSec,
            outPoint: outSec,
            duration: durSec,
            enabled: true,
            locked: false,
            guideLayer: false,
            compId: sequence.id || 1,
            compName: sequence.name || 'Секвенция',
            width: sequence.width || 1920,
            height: sequence.height || 1080,
            bounds: bounds,
            samples: [
                {
                    time: inSec,
                    position: [sequence.width / 2, sequence.height / 2],
                    scale: [100, 100],
                    opacity: 100,
                    rotation: 0,
                    compAABB: bounds,
                    text: captionItem.text || ''
                },
                {
                    time: (inSec + outSec) / 2,
                    position: [sequence.width / 2, sequence.height / 2],
                    scale: [100, 100],
                    opacity: 100,
                    rotation: 0,
                    compAABB: bounds,
                    text: captionItem.text || ''
                }
            ]
        };
    }

    it('converts Premiere Pro ticks to seconds accurately', () => {
        const oneSecTicks = 254016000000;
        assert.equal(ticksToSeconds(oneSecTicks), 1.0);
        assert.equal(ticksToSeconds(508032000000), 2.0);
        assert.equal(ticksToSeconds(2.5), 2.5);
    });

    it('normalizes Essential Graphics clip and runs QC analysis', async () => {
        const sequence = {
            id: 101,
            name: 'Main_Cut_1080p',
            width: 1920,
            height: 1080,
            duration: 60.0,
            frameRate: 25
        };

        const mockGraphicItem = {
            nodeId: 'clip_42',
            name: 'Нижняя треть: Спикер',
            text: 'Президент компнии Иван Иванов', // опечатка в слове "компнии"
            inPoint: 254016000000 * 2, // 2.0s
            outPoint: 254016000000 * 7, // 7.0s
            disabled: false,
            bounds: { left: 100, top: 850, right: 800, bottom: 970, width: 700, height: 120 }
        };

        const normalizedLayer = normalizePProTrackItem(mockGraphicItem, 1, sequence);

        assert.equal(normalizedLayer.inPoint, 2.0);
        assert.equal(normalizedLayer.outPoint, 7.0);
        assert.equal(normalizedLayer.type, 'graphic');
        assert.equal(normalizedLayer.compName, 'Main_Cut_1080p');

        const qc = new BroadcastQCCore({
            checkSpelling: true,
            checkSafeZone: true,
            checkReadingSpeed: false
        });

        const report = await qc.analyze({
            composition: sequence,
            layers: [normalizedLayer]
        });

        assert.equal(report.summary.totalLayersChecked, 1);
        assert.ok(report.issues.length > 0, 'Must detect issues in mock graphic item');

        const spellingIssue = report.issues.find(i => i.category === 'spelling' && i.word === 'компнии');
        assert.ok(spellingIssue, 'Must find spelling issue in "компнии"');
        assert.equal(spellingIssue.word, 'компнии');
    });

    it('normalizes Caption Track subtitles and detects high CPS / reading speed warning', async () => {
        const sequence = {
            id: 102,
            name: 'Reels_Captions_9x16',
            width: 1080,
            height: 1920,
            duration: 15.0,
            frameRate: 30
        };

        // Long caption text shown for only 0.4 seconds (high CPS)
        const mockCaptionItem = {
            id: 'cap_1',
            text: 'Добро пожаловать на наш специальный расширенный телевизионный выпуск новостей',
            inPoint: 254016000000 * 1.0,
            outPoint: 254016000000 * 1.4, // 0.4s
            bounds: { left: 100, top: 1500, right: 980, bottom: 1620, width: 880, height: 120 }
        };

        const normalizedCaption = normalizePProCaptionItem(mockCaptionItem, 0, sequence);

        assert.equal(normalizedCaption.inPoint, 1.0);
        assert.equal(normalizedCaption.outPoint, 1.4);
        assert.equal(normalizedCaption.isCaption, true);

        const qc = new BroadcastQCCore({
            checkSpelling: false,
            checkSafeZone: false,
            checkReadingSpeed: true
        });

        const report = await qc.analyze({
            composition: sequence,
            layers: [normalizedCaption]
        });

        const readingSpeedIssue = report.issues.find(i => i.category === 'reading-speed');
        assert.ok(readingSpeedIssue, 'Must trigger reading speed warning for caption with too high CPS');
    });
});
