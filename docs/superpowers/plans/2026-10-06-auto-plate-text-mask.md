# Auto-Plate Text Masking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать функцию маскирования текста по границам адаптивной плашки (Auto-Plate Text Mask) в After Effects, обеспечивающую изоляцию анимации текста при 100% сохранении цвета и непрозрачности, динамическое переключение через Effect Controls, тумблер в CEP-панели и поддержку обновления существующих плашек.

**Architecture:** Использование служебного скрытого шейпового слоя `[Matte]` (Shy + Locked + 100% Alpha) и современной системы Track Matte в AE (2023–2026+). Габариты и скругление подложки привязываются выражениями к визуальной плашке и управляются чекбоксом «Mask Text Content». Клиентский интерфейс CEP расширяется тумблером маскирования для создания и обновления плашек.

**Tech Stack:** JavaScript (ES6+), Adobe ExtendScript (After Effects API, TrackMatteType), HTML5/CSS (CEP Panel), Node.js test runner.

## Global Constraints

- Поддерживаемый хост: Adobe After Effects 2023–2026+ (нативная поддержка произвольных Track Matte слоев)
- Непрозрачность текста должна быть 100% независимой от визуальной прозрачности плашки
- Слой подложки `[Matte]` должен быть скрытым (`shy = true`) и заблокированным (`locked = true`)
- Все изменения в кодовой базе синхронизируются между `packages/auto-plate` и `apps/ae-extension/packages/auto-plate`
- Все существующие тесты проекта должны оставаться зелеными

---

### Task 1: Auto-Plate Expressions & Config Engine

**Files:**
- Modify: `packages/auto-plate/src/expressions.js`
- Modify: `packages/auto-plate/src/plate-engine.js`
- Modify: `packages/auto-plate/src/presets.js`
- Modify: `tests/auto-plate.test.js`
- Sync: `apps/ae-extension/packages/auto-plate/`

**Interfaces:**
- Consumes: `plateLayerName` (string)
- Produces: 
  - `PlateExpressionsGenerator.generateMatteSizeExpression(plateLayerName: string): string`
  - `PlateExpressionsGenerator.generateMatteRoundnessExpression(plateLayerName: string): string`
  - `AutoPlateEngine.prepareConfig(userConfig: object): object` (содержит булево `enableMask`)

- [x] **Step 1: Написать failing test в `tests/auto-plate.test.js`**

Добавить тесты проверки генерации выражений для маски и сохранения `enableMask`:
```javascript
test('PlateExpressionsGenerator generates matte size and roundness expressions', () => {
  const sizeExpr = PlateExpressionsGenerator.generateMatteSizeExpression('[Plate] Title');
  const roundExpr = PlateExpressionsGenerator.generateMatteRoundnessExpression('[Plate] Title');

  assert.ok(sizeExpr.includes('Mask Text Content'));
  assert.ok(sizeExpr.includes('[Plate] Title'));
  assert.ok(sizeExpr.includes('999999'));

  assert.ok(roundExpr.includes('Mask Text Content'));
  assert.ok(roundExpr.includes('[Plate] Title'));
});

test('AutoPlateEngine preserves enableMask in prepared config', () => {
  const cfgOn = AutoPlateEngine.prepareConfig({ enableMask: true });
  assert.strictEqual(cfgOn.enableMask, true);

  const cfgOff = AutoPlateEngine.prepareConfig({ enableMask: false });
  assert.strictEqual(cfgOff.enableMask, false);
});
```

- [x] **Step 2: Запустить тесты и убедиться, что они падают**

Запуск: `node --test tests/auto-plate.test.js`  
Ожидается: FAIL (функции `generateMatteSizeExpression` и `generateMatteRoundnessExpression` не определены).

- [x] **Step 3: Реализовать методы выражений и валидацию конфига**

В `packages/auto-plate/src/expressions.js`:
```javascript
static generateMatteSizeExpression(plateLayerName) {
  const safeName = JSON.stringify(plateLayerName);
  return `// Broadcast QC - Dynamic Text Matte Size
var plateLayer = thisComp.layer(${safeName});
var isMasked = 1;
try {
  isMasked = plateLayer.effect("Mask Text Content")("Checkbox").value;
} catch(e) {}

if (isMasked == 1) {
  plateLayer.content("Plate Box").content("Rectangle Path 1").size;
} else {
  [999999, 999999];
}`;
}

static generateMatteRoundnessExpression(plateLayerName) {
  const safeName = JSON.stringify(plateLayerName);
  return `// Broadcast QC - Dynamic Text Matte Roundness
var plateLayer = thisComp.layer(${safeName});
var isMasked = 1;
try {
  isMasked = plateLayer.effect("Mask Text Content")("Checkbox").value;
} catch(e) {}

if (isMasked == 1) {
  plateLayer.content("Plate Box").content("Rectangle Path 1").roundness;
} else {
  0;
}`;
}
```

В `packages/auto-plate/src/plate-engine.js`:
```javascript
config.enableMask = config.enableMask !== false;
```

Синхронизировать файлы в `apps/ae-extension/packages/auto-plate/`.

- [x] **Step 4: Запустить тесты и убедиться, что они проходят**

Запуск: `node --test tests/auto-plate.test.js`  
Ожидается: PASS.

---

### Task 2: Реализация создания маски в ExtendScript (`createAutoPlate`)

**Files:**
- Modify: `apps/ae-extension/host/index.jsx` (функция `createAutoPlate`)

**Interfaces:**
- Consumes: `config.enableMask` (boolean, default `true`)
- Produces: Создание `[Matte] Plate Name` слоя со скрытыми флагами (`shy`, `locked`), добавление эффекта `"Mask Text Content"` на плашку, привязка `sLayer.setTrackMatte(matteLayer, TrackMatteType.ALPHA)`.

- [x] **Step 1: Добавить эффект-контроллер `"Mask Text Content"` на `plateLayer`**

В блоке добавления слайдеров эффектов:
```javascript
var maskChk = effGroup.addProperty("ADBE Checkbox Control");
maskChk.name = "Mask Text Content";
var shouldMask = (config.enableMask !== false);
maskChk.property("Checkbox").setValue(shouldMask ? 1 : 0);
```

- [x] **Step 2: Создать и настроить шейповый слой `[Matte]`**

Если `shouldMask`:
```javascript
var matteLayer = comp.layers.addShape();
matteLayer.name = "[Matte] " + plateLayer.name;
matteLayer.moveBefore(plateLayer);

matteLayer.property("Anchor Point").expression = 'thisComp.layer("' + plateLayer.name + '").transform.anchorPoint;';
matteLayer.property("Position").expression = 'thisComp.layer("' + plateLayer.name + '").transform.position;';
matteLayer.property("Scale").expression = 'thisComp.layer("' + plateLayer.name + '").transform.scale;';
matteLayer.property("Rotation").expression = 'thisComp.layer("' + plateLayer.name + '").transform.rotation;';

var matteContents = matteLayer.property("ADBE Root Vectors Group");
var matteGroup = matteContents.addProperty("ADBE Vector Group");
matteGroup.name = "Matte Box";
var matteGroupContents = matteGroup.property("Contents");

var matteRect = matteGroupContents.addProperty("ADBE Vector Shape - Rect");
matteRect.name = "Rectangle Path 1";
matteRect.property("Position").setValue([0, 0]);
matteRect.property("Size").expression = PlateExpressionsGenerator.generateMatteSizeExpression(plateLayer.name);
matteRect.property("Roundness").expression = PlateExpressionsGenerator.generateMatteRoundnessExpression(plateLayer.name);

var matteFill = matteGroupContents.addProperty("ADBE Vector Graphic - Fill");
matteFill.property("Color").setValue([1.0, 1.0, 1.0, 1.0]);
matteFill.property("Opacity").setValue(100);

matteLayer.shy = true;
matteLayer.locked = true;
matteLayer.enabled = false;

for (var si = 0; si < selLayers.length; si++) {
    try {
        var targetLayer = selLayers[si];
        if (typeof targetLayer.setTrackMatte === "function") {
            targetLayer.setTrackMatte(matteLayer, TrackMatteType.ALPHA);
        } else {
            targetLayer.trackMatteType = TrackMatteType.ALPHA;
        }
    } catch(tme) {}
}
```

---

### Task 3: Реализация создания/обновления маски в `updateAutoPlate`

**Files:**
- Modify: `apps/ae-extension/host/index.jsx` (функция `updateAutoPlate`)

**Interfaces:**
- Consumes: `config.enableMask` (boolean)
- Produces: Обнаружение существующей маски либо создание новой `[Matte]`, перепривязка к обновленному списку слоев.

- [x] **Step 1: Реализовать обнаружение существующей подложки `[Matte]`**

В `updateAutoPlate`:
```javascript
function findMatteLayer(comp, plateLayer) {
    var expectedName = "[Matte] " + plateLayer.name;
    for (var i = 1; i <= comp.numLayers; i++) {
        var l = comp.layer(i);
        if (l && l.name === expectedName) return l;
    }
    return null;
}
```

- [x] **Step 2: Логика обновления маски по флагу `config.enableMask`**

1. Если `config.enableMask === true`:
   - Если `matteLayer` еще нет: создать его с теми же свойствами и выражениями, что в Task 2, добавить `"Mask Text Content"` на плашку (если отсутствует).
   - Для всех целевых слоев (`targetLayers`): проставить `targetLayer.setTrackMatte(matteLayer, TrackMatteType.ALPHA)`.
   - Проставить значение чекбокса `"Mask Text Content"` в `1`.
2. Если `config.enableMask === false`:
   - Если чекбокс `"Mask Text Content"` есть на плашке: перевести в `0`.
   - Если пользователь снял галочку и хочет отключить подложку: для каждого целевого слоя снять Track Matte (`targetLayer.setTrackMatte(null, TrackMatteType.NO_TRACK_MATTE)` или `targetLayer.trackMatteType = TrackMatteType.NO_TRACK_MATTE;`).

---

### Task 4: Обновление интерфейса панели (CEP Client)

**Files:**
- Modify: `apps/ae-extension/client/index.html`
- Modify: `apps/ae-extension/client/js/main.js`

**Interfaces:**
- Consumes: `plateState.enableMask`
- Produces: HTML-разметка тумблера `#chkPlateMask`, обработчики событий `change`, передача в `createAutoPlateInAE` и `updateAutoPlateInAE`.

- [x] **Step 1: Добавить блок карточки маскирования в `index.html`**

Вставить в секцию `#tab-plate` перед кнопками действий карточку:
```html
<!-- 4. Маскирование текста (Text Masking) -->
<div class="action-card" style="gap: 8px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11.5px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            <span>✂️ Маска текста по границам плашки</span>
        </div>
        <label class="switch-toggle" style="margin: 0;">
            <input type="checkbox" id="chkPlateMask" checked>
            <span class="slider round"></span>
        </label>
    </div>
    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
        Ограничивает текст границами плашки для анимации вылета. Текст сохраняет 100% сочность и непрозрачность. Управляется чекбоксом в Effect Controls плашки.
    </div>
</div>
```

- [x] **Step 2: Привязать состояние `#chkPlateMask` в `main.js`**

В функции `initAutoPlateUI()`:
```javascript
const chkPlateMask = document.getElementById('chkPlateMask');
if (chkPlateMask) {
  chkPlateMask.checked = plateState.enableMask !== false;
  chkPlateMask.addEventListener('change', () => {
    plateState.enableMask = chkPlateMask.checked;
    savePlateState();
  });
}
```

Убедиться, что `updateAutoPlateInAE()` также считывает `plateState` через `AutoPlateEngine.prepareConfig(plateState)` и передает `enableMask` в JSON-пейлоад.

---

### Task 5: Полная верификация тестов

**Files:**
- Run: `tests/auto-plate.test.js`
- Run: `tests/project-health.test.js`
- Run: `npm test`

- [x] **Step 1: Запустить тестовый сьют**

Запуск: `npm test`  
Ожидается: Все тесты (включая линтинг синтаксиса JSX/JS, auto-plate, spelling, reporting) зеленые (PASS).

- [ ] **Step 2: Зафиксировать изменения в git**

Запуск:
```bash
git add packages/auto-plate apps/ae-extension tests/ docs/
git commit -m "feat(auto-plate): add isolated text mask track matte with on-off control and update support"
```
