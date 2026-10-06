# Broadcast QC — Спецификация функции маскирования текста для Auto-Plate (Text Masking & Track Matte)

**Дата:** 2026-10-06  
**Версия:** 1.1.0  
**Статус:** Согласовано  

---

## 1. Цель и требования

Добавить в модуль адаптивных плашек (**Auto-Plate**) в Adobe After Effects возможность маскирования целевых текстовых слоев границами плашки. 

### Ключевые требования:
1. **Изоляция анимации текста:** Текст не должен выходить за визуальные границы плашки (например, при анимации вылета текста слева, снизу или при масштабировании).
2. **100% непрозрачность и сочность цвета:** Если плашка полупрозрачная (стиль Glassmorphism с Opacity 50%, градиент или темная подложка), текст внутри нее обязан сохранять 100% непрозрачности и свой собственный цвет. Не допускается размытие альфы текста из-за полупрозрачности плашки.
3. **Управление прямо на плашке:** На слое плашки в панели **Effect Controls** должен присутствовать переключатель (`ADBE Checkbox Control`: *«Mask Text Content»*), позволяющий включать и выключать маску в любой момент (и анимировать ее ключевыми кадрами).
4. **Галочка в интерфейсе панели:** В меню создания/настройки плашки должен быть наглядный тумблер: `✂️ Ограничить текст границами плашки (Текстовая маска)`.
5. **Поддержка обновления плашек (`updateAutoPlate`):** Если плашка была ранее создана без маски, при выборе этой плашки со слоями и нажатии кнопки **«Обновить плашку»** маска должна быть создана и привязана ко всем текстовым слоям.

---

## 2. Архитектура After Effects (Track Matte & Expressions)

### 2.1. Структура слоев в таймлайне

```
[Layer 1..N]   Текстовые слои (Target Layers)
               └─ Track Matte: Alpha Matte -> указывает на [Matte] [Plate] Name
                  (Обрезаются границами подложки, сохраняют 100% альфу)

[Layer N+1]    [Matte] [Plate] Name (Служебный Shape Layer)
               ├─ Заливка: 100% Solid Fill (Alpha = 1.0)
               ├─ Size & Roundness: связаны выражениями с плашкой
               ├─ Transform: Position, Anchor Point, Scale, Rotation связаны с плашкой
               └─ Флаги слоя:
                    • shy = true (скрывается кнопкой Hide Shy Layers)
                    • locked = true (защищен от случайного выделения)
                    • enabled = false (видео-глаз отключен)

[Layer N+2]    [Plate] Name (Визуальный Shape Layer)
               ├─ Contents: Fill (любая Opacity), Stroke, Rectangle Path
               └─ Effect Controls:
                    • Padding Left, Right, Top, Bottom
                    • Roundness
                    • [NEW] Checkbox Control: "Mask Text Content" (1 = ON, 0 = OFF)
```

---

## 2.2. Выражения для служебного слоя `[Matte]`

#### 1. Rectangle Path Size:
```javascript
// Broadcast QC - Dynamic Text Matte Size
var plateLayer = thisComp.layer("[Plate] Target");
var isMasked = 1;
try {
  isMasked = plateLayer.effect("Mask Text Content")("Checkbox").value;
} catch(e) {}

if (isMasked == 1) {
  plateLayer.content("Plate Box").content("Rectangle Path 1").size;
} else {
  // При выключении маски размер раскрывается до бесконечности
  [999999, 999999];
}
```

#### 2. Rectangle Path Roundness:
```javascript
// Broadcast QC - Dynamic Text Matte Roundness
var plateLayer = thisComp.layer("[Plate] Target");
var isMasked = 1;
try {
  isMasked = plateLayer.effect("Mask Text Content")("Checkbox").value;
} catch(e) {}

if (isMasked == 1) {
  plateLayer.content("Plate Box").content("Rectangle Path 1").roundness;
} else {
  0;
}
```

#### 3. Трансформации (Transform):
* `Position`: `thisComp.layer("[Plate] Target").transform.position`
* `Anchor Point`: `thisComp.layer("[Plate] Target").transform.anchorPoint`
* `Scale`: `thisComp.layer("[Plate] Target").transform.scale`
* `Rotation`: `thisComp.layer("[Plate] Target").transform.rotation`

---

## 3. Сценарии работы в ExtendScript (`host/index.jsx`)

### 3.1. Создание новой плашки (`createAutoPlate`)
1. Считывается `config.enableMask` (по умолчанию `true`).
2. Создается визуальный слой `plateLayer`. На него добавляются слайдеры отступов, скругления и чекбокс:
   ```javascript
   var maskChk = effGroup.addProperty("ADBE Checkbox Control");
   maskChk.name = "Mask Text Content";
   maskChk.property("Checkbox").setValue(config.enableMask ? 1 : 0);
   ```
3. Если `config.enableMask === true`:
   * Создается шейповый слой `matteLayer = comp.layers.addShape()`.
   * Назначается имя: `"[Matte] " + plateLayer.name`.
   * Позиционируется между целевыми слоями и плашкой: `matteLayer.moveBefore(plateLayer)`.
   * Наполняется группой `"Matte Box"` с прямоугольником и белой заливкой 100% Opacity.
   * Назначаются выражения размера, скругления и трансформаций с привязкой к `plateLayer.name`.
   * Выставляются флаги: `matteLayer.shy = true; matteLayer.locked = true;`.
   * Для всех целевых слоев: `sLayer.setTrackMatte(matteLayer, TrackMatteType.ALPHA);`.

### 3.2. Обновление существующей плашки (`updateAutoPlate`)
1. Находится существующая плашка `plateLayer` и список целевых слоев.
2. Проверяется наличие служебного слоя подложки (по имени `"[Matte] " + plateLayer.name` или поиску привязанного Track Matte).
3. **Если `config.enableMask === true`**:
   * Если слоя `[Matte]` ещё нет: он создается, наполняется выражениями, и к `plateLayer` добавляется чекбокс `"Mask Text Content"`.
   * Для всех целевых слоев (включая вновь добавленные) проставляется `setTrackMatte(matteLayer, TrackMatteType.ALPHA)`.
4. **Если `config.enableMask === false`**:
   * Если чекбокс `"Mask Text Content"` есть на плашке: выставляется в `0`.
   * Если пользователь явно снял флаг и обновляет плашку: снимается Track Matte с целевых слоев (`sLayer.setTrackMatte(null, TrackMatteType.NO_TRACK_MATTE)` или `sLayer.removeTrackMatte()`).

---

## 4. Пользовательский интерфейс панели (CEP Client)

### 4.1. Разметка (`index.html`)
В блоке `#tab-plate` добавляется карточка маскирования:
```html
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
        Ограничивает текст границами плашки для анимации вылета. Текст сохраняет 100% непрозрачность при полупрозрачной плашке. Включается и выключается в Effect Controls.
    </div>
</div>
```

### 4.2. Контроллер (`main.js`)
* Синхронизация `#chkPlateMask` с `plateState.enableMask`.
* Сохранение значения в `localStorage`.
* Передача `enableMask` как в `createAutoPlateInAE()`, так и в `updateAutoPlateInAE()`.

---

## 5. План тестирования и верификация

1. **Модульные тесты `tests/auto-plate.test.js`**:
   * Проверка `AutoPlateEngine.prepareConfig` с параметром `enableMask: true/false`.
   * Проверка генерации выражений размера и скругления для Matte слоя.
2. **Тестирование сценариев в After Effects**:
   * Создание плашки с `enableMask = true` -> проверка создания слоя `[Matte]`, флагов Shy/Locked, назначения Track Matte на текст.
   * Проверка полупрозрачности: плашка со стилем Glassmorphism (50% Opacity) -> текст остается 100% непрозрачным.
   * Проверка переключателя: снятие галочки `"Mask Text Content"` в Effect Controls -> маска раскрывается, текст виден за границами плашки.
   * Проверка обновления: создание плашки без маски -> включение галочки в панели -> «Обновить плашку» -> маска создается и привязывается.
