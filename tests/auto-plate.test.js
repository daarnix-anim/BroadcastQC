import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  AutoPlateEngine, 
  PlateExpressionsGenerator, 
  ORIGIN_POINTS, 
  STYLE_PRESETS,
  DEFAULT_PLATE_CONFIG 
} from '../packages/auto-plate/index.js';

describe('Auto-Plate Module Tests', () => {

  it('calculates correct union bounding box for multiple text layers', () => {
    // Layer 1: Name [left: 100, top: 200, width: 300, height: 40]
    // Layer 2: Title [left: 100, top: 245, width: 220, height: 25]
    // Layer 3: Info [left: 100, top: 275, width: 450, height: 20]
    const layers = [
      { left: 100, top: 200, width: 300, height: 40 },
      { left: 100, top: 245, width: 220, height: 25 },
      { left: 100, top: 275, width: 450, height: 20 }
    ];

    const padding = { top: 20, bottom: 20, left: 30, right: 30 };
    const bounds = AutoPlateEngine.calculateUnionBounds(layers, padding);

    // Content bounds:
    // minX = 100, maxX = 100 + 450 = 550 (width = 450)
    // minY = 200, maxY = 275 + 20 = 295 (height = 95)
    assert.strictEqual(bounds.contentWidth, 450);
    assert.strictEqual(bounds.contentHeight, 95);

    // Total plate bounds with padding:
    assert.strictEqual(bounds.width, 450 + 30 + 30); // 510
    assert.strictEqual(bounds.height, 95 + 20 + 20); // 135
  });

  it('calculates asymmetrical paddings correctly', () => {
    const layers = [
      { left: 0, top: 0, width: 200, height: 50 }
    ];
    const padding = { top: 10, bottom: 30, left: 40, right: 60 };
    const bounds = AutoPlateEngine.calculateUnionBounds(layers, padding);

    assert.strictEqual(bounds.width, 200 + 40 + 60); // 300
    assert.strictEqual(bounds.height, 50 + 10 + 30); // 90
    // Asymmetrical center offset
    assert.strictEqual(bounds.centerX, 100 + (60 - 40) / 2); // 110
    assert.strictEqual(bounds.centerY, 25 + (30 - 10) / 2); // 35
  });

  it('generates valid AE Expression strings', () => {
    const layerNames = ['Name Layer', 'Title Layer', 'Info Layer'];
    const expressions = AutoPlateEngine.generateExpressions(layerNames, {
      paddingTop: 25,
      paddingBottom: 25,
      paddingLeft: 35,
      paddingRight: 35,
      animType: 'expand_x',
      originPoint: 0
    });

    assert.ok(expressions.sizeExpression.includes('sourceRectAtTime'));
    assert.ok(expressions.sizeExpression.includes('Padding Left'));
    assert.ok(expressions.positionExpression.includes('toComp'));
    assert.ok(expressions.anchorPointExpression.includes('Origin Point'));
    assert.ok(expressions.scaleExpression.includes('expand_x'));
    assert.ok(expressions.roundnessExpression.includes('Roundness'));
  });

  it('validates and clamps user configuration safely', () => {
    const badConfig = {
      paddingTop: -50,
      paddingLeft: 'invalid',
      originPoint: 99,
      style: 'non_existent'
    };

    const prepared = AutoPlateEngine.prepareConfig(badConfig);
    assert.strictEqual(prepared.paddingTop, 0);
    assert.strictEqual(prepared.paddingLeft, 0);
    assert.strictEqual(prepared.originPoint, 8); // clamped to max 8
    assert.strictEqual(prepared.styleData.opacity, 88); // defaults to glass opacity
  });

  it('supports all 9 origin points definition', () => {
    assert.strictEqual(Object.keys(ORIGIN_POINTS).length, 9);
    assert.strictEqual(ORIGIN_POINTS.TOP_LEFT.id, 0);
    assert.strictEqual(ORIGIN_POINTS.CENTER.id, 4);
    assert.strictEqual(ORIGIN_POINTS.BOTTOM_RIGHT.id, 8);
  });

  it('separates plate and target elements correctly for update mode', () => {
    const mixed = ['Title Layer', '[Plate] Title Layer', 'Subtitle Layer', 'Icon Layer', 'Title Layer'];
    const res = AutoPlateEngine.separatePlateAndTargets(mixed);

    assert.strictEqual(res.plateName, '[Plate] Title Layer');
    assert.deepStrictEqual(res.targetNames, ['Title Layer', 'Subtitle Layer', 'Icon Layer']);

    const onlyTargets = ['Layer 1', 'Layer 2'];
    const res2 = AutoPlateEngine.separatePlateAndTargets(onlyTargets);
    assert.strictEqual(res2.plateName, null);
    assert.deepStrictEqual(res2.targetNames, ['Layer 1', 'Layer 2']);
  });
});
