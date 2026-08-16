# After Effects 2026.2 API Research & Technical Specification

## 1. Среда выполнения и архитектура расширения (CEP)

Для Adobe After Effects 2026.2 (версия v26.2+) целевым форматом расширения является **CEP (Common Extensibility Platform) / CSXS 11–13**.

### Параметры манифеста (`CSXS/manifest.xml`):
- **Host ID**: `AEFT` (Adobe After Effects)
- **Host Version Range**: `[18.0, 99.9]` (покрывает все современные версии, включая 2026.2+)
- **Среда выполнения**:
  - Frontend: Chromium Embedded Framework (HTML5 / ES6+ / CSS3 / WebGL).
  - Backend внутри панели: Node.js (v18+ в современных сборках CEP), обеспечивающий прямой доступ к файловой системе (`fs`), путям (`path`), парсерам словарей и сетевым запросам.
  - ExtendScript Host: ECMAScript 3 (с поддержкой JSON via `json2.jsx`), выполняющийся в основном потоке After Effects через `CSInterface.evalScript()`.

### Механизм реестра Windows для разработки и установки:
Для загрузки неподписанных пользовательских расширений в Windows активируется ключ реестра `PlayerDebugMode = "1"` для версий CSXS:
```cmd
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f
```
Путь установки расширения:
`%APPDATA%\Adobe\CEP\extensions\com.broadcast.qc`

---

## 2. API работы с текстом в After Effects (ExtendScript)

### 2.1. Извлечение параметров `TextDocument`
Текстовые слои в AE имеют тип `TextLayer` (`layer instanceof TextLayer` или `layer.property("Source Text") != null`).

```javascript
var sourceTextProp = layer.property("Source Text");
var textDoc = sourceTextProp.value; // TextDocument

var layerData = {
    text: textDoc.text,
    font: textDoc.font,
    fontSize: textDoc.fontSize,
    justification: textDoc.justification, // ParagraphJustification
    allCaps: textDoc.allCaps,
    smallCaps: textDoc.smallCaps,
    tracking: textDoc.tracking,
    pointText: textDoc.pointText, // true для точечного, false для абзацного
    boxTextSize: textDoc.pointText ? null : textDoc.boxTextSize // [width, height]
};
```

### 2.2. Анимированный текст и выражения (Expressions)
Текст может меняться во времени:
1. **Ключевые кадры на `Source Text`**:
   `sourceTextProp.numKeys > 0` $\rightarrow$ извлекаем значения на каждом ключевом кадре `sourceTextProp.keyValue(k).text` и время `sourceTextProp.keyTime(k)`.
2. **Expressions на `Source Text`** (например `Math.round(time)` или таймкоды):
   Если `sourceTextProp.hasExpression && sourceTextProp.expressionEnabled`, текст вычисляется динамически при сэмплировании таймлайна `sourceTextProp.valueAtTime(time, false).text`.

---

## 3. API работы с геометрией и Safe Zone

### 3.1. Определение локальных границ текста (`sourceRectAtTime`)
Нативный метод After Effects:
```javascript
var rect = layer.sourceRectAtTime(time, false);
// Возвращает объект: { top: Number, left: Number, width: Number, height: Number }
```
- `time` — время в секундах в шкале композиции.
- Второй аргумент `false` исключает экстенты эффектов (размытие, тени), измеряя именно чистые контуры глифов текста.

### 3.2. Преобразование в координаты композиции (`toComp`)
У слоя могут быть:
- Смещение `position`, `anchorPoint`
- Масштаб `scale` (в т.ч. отрицательный или неоднородный)
- Поворот `rotation` (или `orientation` / 3D `xRotation`, `yRotation`, `zRotation`)
- Цепочка родителей `parent` $\rightarrow$ `parent.parent` ...
- 3D режим слоя (`threeDLayer = true`) и активная камера композиции.

**Решение**: Метод `layer.toComp([x, y], time)` берет любую точку в локальной системе координат слоя и возвращает точную координату `[compX, compY]` в пространстве 2D композиции с учетом ВСЕЙ цепочки родителей, трансформаций и проекций камеры:

```javascript
function getCompBoundingPolygon(layer, time) {
    var rect = layer.sourceRectAtTime(time, false);
    
    // 4 угла локального прямоугольника
    var pTL = [rect.left, rect.top];
    var pTR = [rect.left + rect.width, rect.top];
    var pBR = [rect.left + rect.width, rect.top + rect.height];
    var pBL = [rect.left, rect.top + rect.height];
    
    // Перевод в координаты композиции
    var cTL = layer.toComp(pTL, time);
    var cTR = layer.toComp(pTR, time);
    var cBR = layer.toComp(pBR, time);
    var cBL = layer.toComp(pBL, time);
    
    // Осесимметричный Bounding Box (AABB) в композиции:
    var xs = [cTL[0], cTR[0], cBR[0], cBL[0]];
    var ys = [cTL[1], cTR[1], cBR[1], cBL[1]];
    
    return {
        points: [cTL, cTR, cBR, cBL],
        aabb: {
            left: Math.min.apply(null, xs),
            top: Math.min.apply(null, ys),
            right: Math.max.apply(null, xs),
            bottom: Math.max.apply(null, ys),
            width: Math.max.apply(null, xs) - Math.min.apply(null, xs),
            height: Math.max.apply(null, ys) - Math.min.apply(null, ys)
        }
    };
}
```

---

## 4. API навигации по композициям и таймлайну

При клике на ошибку в отчете плагина:
```javascript
function navigateToIssue(compIndex, layerIndex, timeInSeconds) {
    var comp = app.project.item(compIndex);
    if (!(comp instanceof CompItem)) return false;
    
    // 1. Открыть композицию в активном просмотрщике
    comp.openInViewer();
    
    // 2. Установить курсор воспроизведения на таймкод проблемы
    if (timeInSeconds !== undefined && timeInSeconds !== null) {
        comp.time = timeInSeconds;
    }
    
    // 3. Выделить проблемный слой
    if (layerIndex >= 1 && layerIndex <= comp.numLayers) {
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = (i === layerIndex);
        }
    }
    
    return true;
}
```

---

## 5. Выводы и технические решения для MVP

1. **ExtendScript Adapter**: Выполняет чистый сбор данных (сканирование слоев, `sourceRectAtTime`, `toComp`, `app.project`) и возвращает JSON-строку в CEP панель.
2. **Вычисления в Node.js / Browser (JS Core)**:
   - Проверка орфографии, морфология, whitelist словаря.
   - Детекция стабильных окон (Stable State) по массиву полученных сэмплов.
   - Геометрическая проверка пересечения Safe Zone и формирование отчета.
   - Такой подход не блокирует интерфейс AE и работает с максимальной скоростью.
