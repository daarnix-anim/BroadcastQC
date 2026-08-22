/**
 * Broadcast QC 2.0 - ExtendScript Host Adapter for Adobe After Effects 2026.2+
 * Runs inside After Effects scripting engine (ES3).
 * Provides live logging to AE Info Panel (writeLn) and status bar updates.
 */

// Basic JSON serialization & parsing support for ExtendScript (ES3)
var JSONHelper = {
    parse: function(jsonStr) {
        if (!jsonStr) return null;
        if (typeof JSON !== "undefined" && JSON.parse) {
            return JSON.parse(jsonStr);
        }
        return eval("(" + jsonStr + ")");
    },
    stringify: function(obj) {
        if (typeof JSON !== "undefined" && JSON.stringify) {
            return JSON.stringify(obj);
        }
        return this._serialize(obj);
    },
    _serialize: function(obj) {
        var t = typeof obj;
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
            return String(obj);
        }
        var isArr = (obj instanceof Array);
        var res = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = obj[k];
                if (typeof v !== "function" && typeof v !== "undefined") {
                    res.push((isArr ? "" : ('"' + k + '":')) + this._serialize(v));
                }
            }
        }
        return (isArr ? "[" : "{") + res.join(",") + (isArr ? "]" : "}");
    }
};

var BroadcastQCHost = {
    /**
     * Возвращает подробную информацию о версии After Effects, проекте и активной композиции
     */
    getInfo: function() {
        try {
            var proj = app.project;
            var hasProj = proj !== null;
            var activeComp = (hasProj && proj.activeItem && (proj.activeItem instanceof CompItem)) ? proj.activeItem : null;
            
            var textLayersCount = 0;
            if (activeComp) {
                for (var i = 1; i <= activeComp.numLayers; i++) {
                    var l = activeComp.layer(i);
                    if (l.property("Source Text") !== null) {
                        textLayersCount++;
                    }
                }
            }

            return JSONHelper.stringify({
                success: true,
                appVersion: app.version,
                appName: app.appName,
                hasProject: hasProj,
                projectName: (hasProj && proj.file) ? proj.file.name : (hasProj ? "Новый проект (без названия)" : "Нет проекта"),
                projectPath: (hasProj && proj.file) ? proj.file.fsName : "",
                hasActiveComp: activeComp !== null,
                activeCompName: activeComp ? activeComp.name : "",
                activeCompDuration: activeComp ? activeComp.duration : 0,
                activeCompLayers: activeComp ? activeComp.numLayers : 0,
                activeCompTextLayers: textLayersCount
            });
        } catch (e) {
            return JSONHelper.stringify({
                success: false,
                appVersion: app.version || "2026",
                error: e.toString()
            });
        }
    },

    /**
     * Сканирует активную композицию и собирает все текстовые слои с их геометрией во времени
     */
    /**
     * Поиск композиции в проекте по compId
     */
    _findCompById: function(compId) {
        if (!app.project) return null;
        if (!compId || compId === 0) return app.project.activeItem;
        var targetId = parseInt(compId, 10);
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                if (item.id === targetId || item.id === compId) {
                    return item;
                }
            }
        }
        return app.project.activeItem;
    },

    /**
     * Рекурсивный сбор текстовых слоев из композиции и её дочерних Pre-comps
     */
    _collectCompTextLayers: function(comp, sampleStepFrames, parentCompName, scanNested, visitedCompIds, allLayers) {
        if (!comp || !(comp instanceof CompItem)) return;
        var cId = String(comp.id);
        if (visitedCompIds[cId]) return;
        visitedCompIds[cId] = true;

        var stepFrames = sampleStepFrames || 5;
        var frameDuration = comp.frameDuration;
        var stepSeconds = stepFrames * frameDuration;

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);

            // Рекурсивный сбор слоев из вложенных Pre-compositions
            if (scanNested && (layer instanceof AVLayer) && (layer.source instanceof CompItem)) {
                this._collectCompTextLayers(layer.source, sampleStepFrames, (parentCompName ? (parentCompName + " > ") : "") + comp.name, scanNested, visitedCompIds, allLayers);
            }

            // Проверяем, является ли слой текстовым
            var sourceTextProp = layer.property("Source Text");
            if (sourceTextProp === null) {
                continue;
            }

            var textDoc = sourceTextProp.value;
            var layerText = textDoc ? textDoc.text : "";

            var layerData = {
                id: layer.index,
                index: layer.index,
                name: layer.name,
                compId: comp.id,
                compName: comp.name,
                parentCompName: parentCompName || "",
                isNested: !!parentCompName,
                enabled: layer.enabled,
                locked: layer.locked,
                shy: layer.shy,
                guideLayer: layer.guideLayer || false,
                inPoint: layer.inPoint,
                outPoint: layer.outPoint,
                startTime: layer.startTime,
                threeDLayer: layer.threeDLayer,
                hasParent: layer.parent !== null,
                text: layerText,
                font: textDoc ? textDoc.font : "",
                fontSize: textDoc ? textDoc.fontSize : 0,
                textVariations: [],
                samples: []
            };

            // Сбор вариаций текста при наличии ключевых кадров
            if (sourceTextProp.numKeys > 0) {
                for (var k = 1; k <= sourceTextProp.numKeys; k++) {
                    var kTime = sourceTextProp.keyTime(k);
                    var kDoc = sourceTextProp.keyValue(k);
                    if (kDoc && kDoc.text) {
                        layerData.textVariations.push({
                            time: kTime,
                            text: kDoc.text
                        });
                    }
                }
            }

            // Сэмплирование геометрии слоя во времени
            var startTime = Math.max(0, layer.inPoint);
            var endTime = Math.min(comp.duration, layer.outPoint);
            var duration = endTime - startTime;
            var actualStep = stepSeconds;
            if (duration / actualStep > 150) {
                actualStep = duration / 150;
            }

            for (var t = startTime; t <= endTime; t += actualStep) {
                try {
                    var rect = layer.sourceRectAtTime(t, false);
                    
                    var pTL = [rect.left, rect.top];
                    var pTR = [rect.left + rect.width, rect.top];
                    var pBR = [rect.left + rect.width, rect.top + rect.height];
                    var pBL = [rect.left, rect.top + rect.height];

                    var cTL = layer.toComp(pTL, t);
                    var cTR = layer.toComp(pTR, t);
                    var cBR = layer.toComp(pBR, t);
                    var cBL = layer.toComp(pBL, t);

                    var xs = [cTL[0], cTR[0], cBR[0], cBL[0]];
                    var ys = [cTL[1], cTR[1], cBR[1], cBL[1]];

                    var minX = Math.min(xs[0], Math.min(xs[1], Math.min(xs[2], xs[3])));
                    var maxX = Math.max(xs[0], Math.max(xs[1], Math.max(xs[2], xs[3])));
                    var minY = Math.min(ys[0], Math.min(ys[1], Math.min(ys[2], ys[3])));
                    var maxY = Math.max(ys[0], Math.max(ys[1], Math.max(ys[2], ys[3])));

                    var posProp = layer.transform.position.valueAtTime(t, false);
                    var scaleProp = layer.transform.scale.valueAtTime(t, false);
                    var opProp = layer.transform.opacity.valueAtTime(t, false);
                    var rotVal = 0;
                    if (layer.transform.rotation) {
                        rotVal = layer.transform.rotation.valueAtTime(t, false);
                    } else if (layer.transform.zRotation) {
                        rotVal = layer.transform.zRotation.valueAtTime(t, false);
                    }

                    var curTextDoc = sourceTextProp.valueAtTime(t, false);
                    var curText = curTextDoc ? curTextDoc.text : layerText;

                    layerData.samples.push({
                        time: t,
                        position: [posProp[0], posProp[1], posProp[2] || 0],
                        scale: [scaleProp[0], scaleProp[1]],
                        rotation: rotVal,
                        opacity: opProp,
                        text: curText,
                        compAABB: {
                            left: minX,
                            top: minY,
                            right: maxX,
                            bottom: maxY,
                            width: maxX - minX,
                            height: maxY - minY
                        }
                    });
                } catch (sampleErr) {}
            }

            allLayers.push(layerData);
        }
    },

    /**
     * Сканирует активную композицию (и опционально дочерние Pre-comps)
     */
    scanActiveComposition: function(sampleStepFrames, scanNested) {
        try {
            if (!app.project) {
                writeLn("[Broadcast QC] Ошибка: Проект After Effects не открыт.");
                return JSONHelper.stringify({
                    success: false,
                    code: "NO_PROJECT",
                    error: "В After Effects не открыт проект. Пожалуйста, откройте или создайте проект .aep."
                });
            }

            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                writeLn("[Broadcast QC] Внимание: Не выбрана активная композиция.");
                return JSONHelper.stringify({
                    success: false,
                    code: "NO_COMPOSITION",
                    error: "Не выбрана активная композиция. Пожалуйста, дважды кликните по композиции на панели 'Project' или откройте её вкладку на таймлайне."
                });
            }

            var shouldScanNested = (scanNested === true || scanNested === "true");
            writeLn("[Broadcast QC] ⚡ Запуск анализа композиции: '" + comp.name + "' (" + (shouldScanNested ? "с дочерними Pre-comps" : "только верхний уровень") + ")...");

            var allLayers = [];
            var visitedCompIds = {};
            this._collectCompTextLayers(comp, sampleStepFrames, "", shouldScanNested, visitedCompIds, allLayers);

            var fps = Math.round(1.0 / comp.frameDuration);
            var result = {
                success: true,
                composition: {
                    id: comp.id,
                    name: comp.name,
                    width: comp.width,
                    height: comp.height,
                    duration: comp.duration,
                    frameRate: fps,
                    workAreaStart: comp.workAreaStart,
                    workAreaDuration: comp.workAreaDuration
                },
                layers: allLayers,
                totalCompLayers: comp.numLayers,
                textLayersCount: allLayers.length,
                isNestedScan: shouldScanNested
            };

            writeLn("[Broadcast QC] ✅ Сканирование завершено: собрано " + allLayers.length + " текстовых слоёв.");
            return JSONHelper.stringify(result);
        } catch (e) {
            writeLn("[Broadcast QC] ❌ Ошибка скрипта: " + e.toString());
            return JSONHelper.stringify({
                success: false,
                code: "SCAN_EXCEPTION",
                error: "Ошибка сканирования: " + e.toString() + " (строка " + e.line + ")"
            });
        }
    },

    /**
     * Сканирует абсолютно все композиции в открытом проекте .aep
     */
    scanEntireProject: function(sampleStepFrames) {
        try {
            if (!app.project) {
                return JSONHelper.stringify({
                    success: false,
                    code: "NO_PROJECT",
                    error: "В After Effects не открыт проект .aep."
                });
            }

            var proj = app.project;
            var projectName = proj.file ? proj.file.name : "Текущий проект";
            writeLn("[Broadcast QC] 🚀 Запуск анализа всего проекта '" + projectName + "'...");

            var allLayers = [];
            var visitedCompIds = {};
            var totalComps = 0;

            for (var i = 1; i <= proj.numItems; i++) {
                var item = proj.item(i);
                if (item instanceof CompItem) {
                    totalComps++;
                    this._collectCompTextLayers(item, sampleStepFrames, "", false, visitedCompIds, allLayers);
                }
            }

            var result = {
                success: true,
                composition: {
                    id: 0,
                    name: "Весь проект: " + projectName,
                    width: 1920,
                    height: 1080,
                    duration: 0,
                    frameRate: 30
                },
                layers: allLayers,
                totalCompsCount: totalComps,
                textLayersCount: allLayers.length,
                isProjectScan: true
            };

            writeLn("[Broadcast QC] ✅ Анализ проекта завершен: проверено " + totalComps + " композиций, найдено " + allLayers.length + " текстовых слоёв.");
            return JSONHelper.stringify(result);
        } catch (e) {
            writeLn("[Broadcast QC] ❌ Ошибка анализа проекта: " + e.toString());
            return JSONHelper.stringify({
                success: false,
                error: "Ошибка анализа проекта: " + e.toString()
            });
        }
    },

    /**
     * Автоматическое 1-Click исправление текста в слое с сохранением стилей
     */
    applyTextFix: function(layerIndex, oldText, newText, compId) {
        try {
            if (!app.project) {
                return JSONHelper.stringify({ success: false, error: "Нет открытого проекта" });
            }

            var comp = this._findCompById(compId);
            if (!comp || !(comp instanceof CompItem)) {
                return JSONHelper.stringify({ success: false, error: "Целевая композиция не найдена" });
            }

            var idx = parseInt(layerIndex, 10);
            if (idx < 1 || idx > comp.numLayers) {
                return JSONHelper.stringify({ success: false, error: "Слой #" + idx + " не найден в композиции «" + comp.name + "»" });
            }

            var layer = comp.layer(idx);
            var sourceTextProp = layer.property("Source Text");
            if (!sourceTextProp) {
                return JSONHelper.stringify({ success: false, error: "Слой #" + idx + " не является текстовым" });
            }

            app.beginUndoGroup("Broadcast QC: Авто-исправление текста");

            var textDoc = sourceTextProp.value;
            var currentText = textDoc.text || "";
            if (oldText && newText !== undefined && newText !== null) {
                if (currentText.indexOf(oldText) !== -1) {
                    textDoc.text = currentText.split(oldText).join(newText);
                } else {
                    return JSONHelper.stringify({
                        success: false,
                        error: "Фрагмент «" + oldText + "» не найден в текущем тексте слоя"
                    });
                }
            } else {
                return JSONHelper.stringify({
                    success: false,
                    error: "Не указан заменяемый фрагмент текста"
                });
            }

            sourceTextProp.setValue(textDoc);
            app.endUndoGroup();

            writeLn("[Broadcast QC] ✨ Исправлен фрагмент в слое #" + idx + " ('" + layer.name + "' в '" + comp.name + "'): '" + oldText + "' -> '" + newText + "'");

            return JSONHelper.stringify({
                success: true,
                layerIndex: idx,
                compId: comp.id,
                compName: comp.name,
                layerName: layer.name,
                updatedText: textDoc.text
            });
        } catch (e) {
            writeLn("[Broadcast QC] ❌ Ошибка при замене текста: " + e.toString());
            return JSONHelper.stringify({ success: false, error: e.toString() });
        }
    },

    /**
     * Навигация к конкретному слою и таймкоду в After Effects
     */
    navigateToLayer: function(layerIndex, timeInSeconds, compId) {
        try {
            if (!app.project) {
                return JSONHelper.stringify({ success: false, error: "Нет открытого проекта" });
            }

            var comp = this._findCompById(compId);
            if (!comp || !(comp instanceof CompItem)) {
                return JSONHelper.stringify({ success: false, error: "Целевая композиция не найдена" });
            }

            comp.openInViewer();

            if (timeInSeconds !== undefined && timeInSeconds !== null && !isNaN(timeInSeconds)) {
                comp.time = Math.max(0, Math.min(comp.duration, Number(timeInSeconds)));
            }

            var idx = parseInt(layerIndex, 10);
            if (idx >= 1 && idx <= comp.numLayers) {
                for (var i = 1; i <= comp.numLayers; i++) {
                    comp.layer(i).selected = (i === idx);
                }
                var selLayer = comp.layer(idx);
                writeLn("[Broadcast QC] 🎯 Переход: Композиция '" + comp.name + "' -> Слой #" + idx + " ('" + selLayer.name + "') на " + (timeInSeconds || 0).toFixed(2) + "с");
            }

            return JSONHelper.stringify({ success: true, compId: comp.id, compName: comp.name });
        } catch (e) {
            return JSONHelper.stringify({ success: false, error: e.toString() });
        }
    },

    /**
     * Создание, обновление или удаление визуального Guide-слоя Safe Zone с красными границами в After Effects
     */
    toggleSafeZoneOverlay: function(marginPercentJson, forceState) {
        try {
            if (!app.project || !app.project.activeItem) {
                return JSONHelper.stringify({ success: false, error: "Нет активной композиции" });
            }

            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSONHelper.stringify({ success: false, error: "Активный элемент не является композицией" });
            }

            var guideLayerName = "[QC Guide] Safe Zone";
            var existingLayer = null;

            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === guideLayerName) {
                    existingLayer = comp.layer(i);
                    break;
                }
            }

            var shouldEnable = true;
            if (forceState !== undefined && forceState !== null) {
                shouldEnable = (forceState === true || forceState === "true");
            } else if (existingLayer) {
                shouldEnable = false; // Toggle off if already exists
            }

            if (!shouldEnable) {
                if (existingLayer) {
                    app.beginUndoGroup("Broadcast QC: Скрыть Safe Zone Guide");
                    existingLayer.remove();
                    app.endUndoGroup();
                    writeLn("[Broadcast QC] 🗑 Оверлей Safe Zone удален из композиции");
                }
                return JSONHelper.stringify({ success: true, active: false, message: "Оверлей скрыт" });
            }

            var margins = { top: 5, bottom: 5, left: 5, right: 5, cutouts: [] };
            if (marginPercentJson) {
                try {
                    var parsed = marginPercentJson;
                    while (typeof parsed === "string") {
                        parsed = JSONHelper.parse(parsed);
                    }
                    if (parsed && typeof parsed === "object") {
                        if (parsed.top !== undefined && parsed.top !== null) margins.top = Number(parsed.top);
                        if (parsed.bottom !== undefined && parsed.bottom !== null) margins.bottom = Number(parsed.bottom);
                        if (parsed.left !== undefined && parsed.left !== null) margins.left = Number(parsed.left);
                        if (parsed.right !== undefined && parsed.right !== null) margins.right = Number(parsed.right);
                        if (parsed.cutouts && parsed.cutouts.length > 0) {
                            margins.cutouts = parsed.cutouts;
                        }
                    }
                } catch (parseErr) {
                    writeLn("[Broadcast QC] Ошибка парсинга Safe Zone параметров: " + parseErr.toString());
                }
            }

            app.beginUndoGroup("Broadcast QC: Показать Safe Zone Guide");

            if (!existingLayer) {
                existingLayer = comp.layers.addShape();
                existingLayer.name = guideLayerName;
                existingLayer.moveToBeginning();
                existingLayer.guideLayer = true; // Non-rendering guide layer!
                existingLayer.label = 1; // Red label in AE timeline
                existingLayer.comment = "Broadcast QC Safe Zone Visual Boundary (Non-rendering Guide Layer)";
            }

            // Очищаем векторное содержимое слоя перед перерисовкой
            var contents = existingLayer.property("Contents");
            while (contents.numProperties > 0) {
                contents.property(1).remove();
            }

            var compW = comp.width;
            var compH = comp.height;

            var leftPx = (compW * margins.left) / 100;
            var rightPx = (compW * margins.right) / 100;
            var topPx = (compH * margins.top) / 100;
            var bottomPx = (compH * margins.bottom) / 100;

            var boxW = Math.max(10, compW - leftPx - rightPx);
            var boxH = Math.max(10, compH - topPx - bottomPx);
            var centerX = (leftPx + (compW - rightPx)) / 2;
            var centerY = (topPx + (compH - bottomPx)) / 2;

            existingLayer.transform.position.setValue([0, 0]);
            existingLayer.transform.anchorPoint.setValue([0, 0]);

            // 1. Основной контур безопасной зоны
            var group = contents.addProperty("ADBE Vector Group");
            group.name = "Safe Zone Boundary";
            var groupContents = group.property("Contents");

            var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue([boxW, boxH]);
            rect.property("Position").setValue([centerX, centerY]);
            rect.property("Roundness").setValue(0);

            // Ярко-красный цвет обводки границы [1.0, 0.15, 0.25]
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue([1.0, 0.15, 0.25, 1.0]);
            stroke.property("Stroke Width").setValue(3);
            stroke.property("Opacity").setValue(100);

            // Добавляем штрих-пунктир для лучшей видимости
            try {
                var dashes = stroke.property("Dashes");
                if (dashes) {
                    dashes.addProperty("ADBE Vector Stroke Dash 1").setValue(16);
                    dashes.addProperty("ADBE Vector Stroke Gap 1").setValue(8);
                }
            } catch (dErr) {}

            // 2. Отрисовка непрямоугольных UI-вырезов соцсетей (боковые кнопки, шапка, плашка описания)
            if (margins.cutouts && margins.cutouts.length > 0) {
                for (var cIdx = 0; cIdx < margins.cutouts.length; cIdx++) {
                    var cutout = margins.cutouts[cIdx];
                    var cL = (compW * (cutout.leftPct || 0)) / 100;
                    var cR = (compW * (cutout.rightPct || 100)) / 100;
                    var cT = (compH * (cutout.topPct || 0)) / 100;
                    var cB = (compH * (cutout.bottomPct || 100)) / 100;

                    var cW = Math.max(4, cR - cL);
                    var cH = Math.max(4, cB - cT);
                    var cCenterX = (cL + cR) / 2;
                    var cCenterY = (cT + cB) / 2;

                    var cGroup = contents.addProperty("ADBE Vector Group");
                    cGroup.name = "UI Cutout: " + (cutout.name || cutout.id || "Zone");
                    var cGroupContents = cGroup.property("Contents");

                    var cRect = cGroupContents.addProperty("ADBE Vector Shape - Rect");
                    cRect.property("Size").setValue([cW, cH]);
                    cRect.property("Position").setValue([cCenterX, cCenterY]);
                    cRect.property("Roundness").setValue(cutout.id === "right_actions" ? 24 : 0);

                    // Полупрозрачная красная заливка для заблокированной зоны
                    var cFill = cGroupContents.addProperty("ADBE Vector Graphic - Fill");
                    cFill.property("Color").setValue([1.0, 0.1, 0.2, 1.0]);
                    cFill.property("Opacity").setValue(14);

                    // Красная пунктирная обводка
                    var cStroke = cGroupContents.addProperty("ADBE Vector Graphic - Stroke");
                    cStroke.property("Color").setValue([1.0, 0.2, 0.3, 1.0]);
                    cStroke.property("Stroke Width").setValue(1.5);
                    cStroke.property("Opacity").setValue(80);
                    try {
                        var cDashes = cStroke.property("Dashes");
                        if (cDashes) {
                            cDashes.addProperty("ADBE Vector Stroke Dash 1").setValue(8);
                            cDashes.addProperty("ADBE Vector Stroke Gap 1").setValue(4);
                        }
                    } catch (cdErr) {}
                }
            }

            existingLayer.guideLayer = true;
            existingLayer.locked = false;

            app.endUndoGroup();

            writeLn("[Broadcast QC] 🚨 Safe Zone Overlay активен (Красные границы: " + margins.left + "%L, " + margins.right + "%R, " + margins.top + "%T, " + margins.bottom + "%B, вырезов: " + (margins.cutouts ? margins.cutouts.length : 0) + ")");

            return JSONHelper.stringify({
                success: true,
                active: true,
                boxWidth: boxW,
                boxHeight: boxH,
                margins: margins,
                message: "Красные границы Safe Zone успешно включены в After Effects"
            });
        } catch (e) {
            writeLn("[Broadcast QC] ❌ Ошибка создания Safe Zone Guide: " + e.toString());
            return JSONHelper.stringify({ success: false, error: e.toString() });
        }
    },

    /**
     * Проверка, активен ли оверлей Safe Zone в композиции
     */
    isSafeZoneOverlayActive: function() {
        try {
            if (!app.project || !app.project.activeItem) return "false";
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) return "false";
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === "[QC Guide] Safe Zone") return "true";
            }
            return "false";
        } catch (e) {
            return "false";
        }
    },

    /**
     * Создает адаптивную плашку под выделенные слои (текст, иконки, объекты)
     * с динамическим охватом, отступами, скруглением, маскированием (Track Matte)
     * и анимацией появления из 9 опорных точек.
     */
    createAutoPlate: function(configJson) {
        try {
            if (!app.project || !app.project.activeItem) {
                return JSONHelper.stringify({ success: false, error: "Нет открытой активной композиции в After Effects" });
            }
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSONHelper.stringify({ success: false, error: "Активный элемент не является композицией" });
            }

            var selLayers = comp.selectedLayers;
            if (!selLayers || selLayers.length === 0) {
                return JSONHelper.stringify({ success: false, error: "Выделите хотя бы один текстовый слой или объект в композиции" });
            }

            var config = {};
            if (typeof configJson === "string") {
                try {
                    config = JSONHelper.parse(configJson);
                } catch(pe) {
                    config = {};
                }
            } else if (typeof configJson === "object" && configJson !== null) {
                config = configJson;
            }

            app.beginUndoGroup("Создать адаптивную плашку [Broadcast QC]");

            // 1. Собираем массив имен выделенных слоев и находим самый нижний индекс слоя
            var targetLayerNames = [];
            var maxLayerIndex = -1;
            for (var i = 0; i < selLayers.length; i++) {
                var sLayer = selLayers[i];
                targetLayerNames.push(sLayer.name);
                if (sLayer.index > maxLayerIndex) {
                    maxLayerIndex = sLayer.index;
                }
            }

            // 2. Создаем шейповый слой плашки
            var plateLayer = comp.layers.addShape();
            plateLayer.name = "[Plate] " + (selLayers[0].name.replace(/^\[.*?\]\s*/, ''));
            // Перемещаем слой плашки ровно под самый нижний выделенный слой
            if (maxLayerIndex > 0 && maxLayerIndex <= comp.numLayers) {
                plateLayer.moveAfter(comp.layer(maxLayerIndex));
            }

            // 3. Добавляем эффекты-контроллеры (Sliders) на слой плашки
            var effGroup = plateLayer.property("ADBE Effect Parade");
            
            function addSlider(name, val) {
                var eff = effGroup.addProperty("ADBE Slider Control");
                eff.name = name;
                eff.property("Slider").setValue(val);
                return eff;
            }

            var padL = config.paddingLeft !== undefined ? config.paddingLeft : 30;
            var padR = config.paddingRight !== undefined ? config.paddingRight : 30;
            var padT = config.paddingTop !== undefined ? config.paddingTop : 20;
            var padB = config.paddingBottom !== undefined ? config.paddingBottom : 20;
            var roundness = config.roundness !== undefined ? config.roundness : 16;
            var originPoint = config.originPoint !== undefined ? config.originPoint : 3; // Left-Center default
            var inDur = config.animInDuration !== undefined ? config.animInDuration : 0.45;
            var outDur = config.animOutDuration !== undefined ? config.animOutDuration : 0.35;

            addSlider("Padding Left", padL);
            addSlider("Padding Right", padR);
            addSlider("Padding Top", padT);
            addSlider("Padding Bottom", padB);
            addSlider("Roundness", roundness);
            addSlider("Origin Point (0-8)", originPoint);
            addSlider("In Duration (sec)", inDur);
            addSlider("Out Duration (sec)", outDur);

            // 4. Наполняем шейп содержимым (Rectangle + Fill + Stroke)
            var contents = plateLayer.property("ADBE Root Vectors Group");
            var shapeGroup = contents.addProperty("ADBE Vector Group");
            shapeGroup.name = "Plate Box";
            var groupContents = shapeGroup.property("Contents");

            var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
            rect.name = "Rectangle Path 1";

            // Выражение размера для Rectangle Path
            var targetLayersJson = JSONHelper.stringify(targetLayerNames);
            rect.property("Size").expression = 
                'var targetLayers = ' + targetLayersJson + ';\n' +
                'var padL = effect("Padding Left")("Slider");\n' +
                'var padR = effect("Padding Right")("Slider");\n' +
                'var padT = effect("Padding Top")("Slider");\n' +
                'var padB = effect("Padding Bottom")("Slider");\n' +
                'var minX = 999999, maxX = -999999, minY = 999999, maxY = -999999, valid = 0;\n' +
                'for (var i = 0; i < targetLayers.length; i++) {\n' +
                '  try {\n' +
                '    var l = thisComp.layer(targetLayers[i]);\n' +
                '    if (l && l.active) {\n' +
                '      var r = l.sourceRectAtTime(time, false);\n' +
                '      if (r.width > 0 || r.height > 0) {\n' +
                '        var p1 = l.toComp([r.left, r.top]);\n' +
                '        var p2 = l.toComp([r.left + r.width, r.top]);\n' +
                '        var p3 = l.toComp([r.left, r.top + r.height]);\n' +
                '        var p4 = l.toComp([r.left + r.width, r.top + r.height]);\n' +
                '        minX = Math.min(minX, p1[0], p2[0], p3[0], p4[0]);\n' +
                '        maxX = Math.max(maxX, p1[0], p2[0], p3[0], p4[0]);\n' +
                '        minY = Math.min(minY, p1[1], p2[1], p3[1], p4[1]);\n' +
                '        maxY = Math.max(maxY, p1[1], p2[1], p3[1], p4[1]);\n' +
                '        valid++;\n' +
                '      }\n' +
                '    }\n' +
                '  } catch(e) {}\n' +
                '}\n' +
                'if (valid === 0) [200, 80];\n' +
                'else [Math.max(10, (maxX - minX) + padL + padR), Math.max(10, (maxY - minY) + padT + padB)];';

            // Выражение скругления углов
            rect.property("Roundness").expression = 
                'var r = effect("Roundness")("Slider");\n' +
                'var s = content("Plate Box").content("Rectangle Path 1").size;\n' +
                'Math.min(r, Math.min(s[0], s[1]) / 2);';

            // Заливка (Fill)
            var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
            var col = (config.styleData && config.styleData.color) ? config.styleData.color : [0.08, 0.11, 0.18];
            fill.property("Color").setValue([col[0], col[1], col[2], 1.0]);
            var op = (config.styleData && config.styleData.opacity !== undefined) ? config.styleData.opacity : 90;
            fill.property("Opacity").setValue(op);

            // Обводка (Stroke)
            var strk = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            var strkCol = (config.styleData && config.styleData.strokeColor) ? config.styleData.strokeColor : [1.0, 1.0, 1.0];
            strk.property("Color").setValue([strkCol[0], strkCol[1], strkCol[2], 1.0]);
            var strkW = (config.styleData && config.styleData.strokeWidth !== undefined) ? config.styleData.strokeWidth : 1.5;
            strk.property("Stroke Width").setValue(strkW);
            var strkOp = (config.styleData && config.styleData.strokeOpacity !== undefined) ? config.styleData.strokeOpacity : 30;
            strk.property("Opacity").setValue(strkOp);

            // 5. Выражение Позиции плашки в композиции
            plateLayer.property("Position").expression = 
                'var targetLayers = ' + targetLayersJson + ';\n' +
                'var padL = effect("Padding Left")("Slider");\n' +
                'var padR = effect("Padding Right")("Slider");\n' +
                'var padT = effect("Padding Top")("Slider");\n' +
                'var padB = effect("Padding Bottom")("Slider");\n' +
                'var minX = 999999, maxX = -999999, minY = 999999, maxY = -999999, valid = 0;\n' +
                'for (var i = 0; i < targetLayers.length; i++) {\n' +
                '  try {\n' +
                '    var l = thisComp.layer(targetLayers[i]);\n' +
                '    if (l && l.active) {\n' +
                '      var r = l.sourceRectAtTime(time, false);\n' +
                '      if (r.width > 0 || r.height > 0) {\n' +
                '        var p1 = l.toComp([r.left, r.top]);\n' +
                '        var p2 = l.toComp([r.left + r.width, r.top]);\n' +
                '        var p3 = l.toComp([r.left, r.top + r.height]);\n' +
                '        var p4 = l.toComp([r.left + r.width, r.top + r.height]);\n' +
                '        minX = Math.min(minX, p1[0], p2[0], p3[0], p4[0]);\n' +
                '        maxX = Math.max(maxX, p1[0], p2[0], p3[0], p4[0]);\n' +
                '        minY = Math.min(minY, p1[1], p2[1], p3[1], p4[1]);\n' +
                '        maxY = Math.max(maxY, p1[1], p2[1], p3[1], p4[1]);\n' +
                '        valid++;\n' +
                '      }\n' +
                '    }\n' +
                '  } catch(e) {}\n' +
                '}\n' +
                'if (valid === 0) value;\n' +
                'else [(minX + maxX)/2 + (padR - padL)/2, (minY + maxY)/2 + (padB - padT)/2];';

            // 6. Выражение Якорной точки (Anchor Point) для 9-точечного появления
            plateLayer.property("Anchor Point").expression = 
                'var origin = 4;\n' +
                'try { origin = Math.round(effect("Origin Point (0-8)")("Slider")); } catch(e) {}\n' +
                'var s = content("Plate Box").content("Rectangle Path 1").size;\n' +
                'var w = s[0], h = s[1];\n' +
                'var ox = 0, oy = 0;\n' +
                'switch (origin) {\n' +
                '  case 0: ox = -w/2; oy = -h/2; break;\n' +
                '  case 1: ox = 0;    oy = -h/2; break;\n' +
                '  case 2: ox = w/2;  oy = -h/2; break;\n' +
                '  case 3: ox = -w/2; oy = 0;    break;\n' +
                '  case 4: ox = 0;    oy = 0;    break;\n' +
                '  case 5: ox = w/2;  oy = 0;    break;\n' +
                '  case 6: ox = -w/2; oy = h/2;  break;\n' +
                '  case 7: ox = 0;    oy = h/2;  break;\n' +
                '  case 8: ox = w/2;  oy = h/2;  break;\n' +
                '  default: ox = 0;   oy = 0;    break;\n' +
                '}\n' +
                '[ox, oy];';

            // 7. Выражение Scale для анимации In / Out
            var animType = config.animType || 'expand_x';
            plateLayer.property("Scale").expression = 
                'var inDur = Math.max(0.01, effect("In Duration (sec)")("Slider"));\n' +
                'var outDur = Math.max(0.01, effect("Out Duration (sec)")("Slider"));\n' +
                'var tIn = inPoint, tOut = outPoint;\n' +
                'function easeOutBack(t, b, c, d, s) {\n' +
                '  if (s == undefined) s = 1.35;\n' +
                '  t = t/d - 1;\n' +
                '  return c*(t*t*((s+1)*t + s) + 1) + b;\n' +
                '}\n' +
                'var prog = 100;\n' +
                'if (time < tIn + inDur) {\n' +
                '  var t = Math.max(0, time - tIn);\n' +
                '  prog = Math.min(100, Math.max(0, easeOutBack(t, 0, 100, inDur, 1.35)));\n' +
                '} else if (time > tOut - outDur) {\n' +
                '  var t = Math.max(0, time - (tOut - outDur));\n' +
                '  prog = Math.min(100, Math.max(0, 100 - (t / outDur) * 100));\n' +
                '}\n' +
                'var animMode = "' + animType + '";\n' +
                'if (animMode === "expand_x") [prog, 100];\n' +
                'else if (animMode === "expand_y") [100, prog];\n' +
                'else [prog, prog];';

            // 8. Маскирование слоев контента (Track Matte / Clipping)
            if (config.enableMask !== false) {
                var matteLayer = comp.layers.addShape();
                matteLayer.name = "[Matte] " + plateLayer.name.replace(/^\[Plate\]\s*/, '');
                matteLayer.moveBefore(selLayers[0]);
                
                var mEff = matteLayer.property("ADBE Effect Parade");
                var mPadL = mEff.addProperty("ADBE Slider Control"); mPadL.name = "Padding Left"; mPadL.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Padding Left")("Slider")';
                var mPadR = mEff.addProperty("ADBE Slider Control"); mPadR.name = "Padding Right"; mPadR.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Padding Right")("Slider")';
                var mPadT = mEff.addProperty("ADBE Slider Control"); mPadT.name = "Padding Top"; mPadT.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Padding Top")("Slider")';
                var mPadB = mEff.addProperty("ADBE Slider Control"); mPadB.name = "Padding Bottom"; mPadB.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Padding Bottom")("Slider")';
                var mRnd = mEff.addProperty("ADBE Slider Control"); mRnd.name = "Roundness"; mRnd.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Roundness")("Slider")';
                var mOrig = mEff.addProperty("ADBE Slider Control"); mOrig.name = "Origin Point (0-8)"; mOrig.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Origin Point (0-8)")("Slider")';
                var mInDur = mEff.addProperty("ADBE Slider Control"); mInDur.name = "In Duration (sec)"; mInDur.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("In Duration (sec)")("Slider")';
                var mOutDur = mEff.addProperty("ADBE Slider Control"); mOutDur.name = "Out Duration (sec)"; mOutDur.property("Slider").expression = 'thisComp.layer("' + plateLayer.name + '").effect("Out Duration (sec)")("Slider")';

                var mContents = matteLayer.property("ADBE Root Vectors Group");
                var mShapeGroup = mContents.addProperty("ADBE Vector Group");
                mShapeGroup.name = "Plate Box";
                var mGroupContents = mShapeGroup.property("Contents");
                var mRect = mGroupContents.addProperty("ADBE Vector Shape - Rect");
                mRect.name = "Rectangle Path 1";
                mRect.property("Size").expression = rect.property("Size").expression;
                mRect.property("Roundness").expression = rect.property("Roundness").expression;

                var mFill = mGroupContents.addProperty("ADBE Vector Graphic - Fill");
                mFill.property("Color").setValue([1.0, 1.0, 1.0, 1.0]);
                mFill.property("Opacity").setValue(100);

                matteLayer.property("Position").expression = plateLayer.property("Position").expression;
                matteLayer.property("Anchor Point").expression = plateLayer.property("Anchor Point").expression;
                matteLayer.property("Scale").expression = plateLayer.property("Scale").expression;

                // Назначаем Track Matte для слоев
                for (var j = 0; j < selLayers.length; j++) {
                    var targetL = selLayers[j];
                    try {
                        if (typeof targetL.setTrackMatte === "function") {
                            targetL.setTrackMatte(matteLayer, TrackMatteType.ALPHA);
                        } else if (typeof TrackMatteType !== "undefined" && TrackMatteType.ALPHA !== undefined) {
                            targetL.trackMatteType = TrackMatteType.ALPHA;
                        }
                    } catch (tme) {}

                    // 9. Анимация выезда текста (Slide In)
                    if (config.animateTextIn) {
                        var slideDir = config.textSlideDirection || 'left';
                        var delay = 0.08 * (j + 1);
                        targetL.property("Position").expression = 
                            'var delay = ' + delay + ';\n' +
                            'var dur = 0.45;\n' +
                            'var tStart = inPoint + delay;\n' +
                            'function easeOutCubic(t, b, c, d) { t = t/d - 1; return c*(t*t*t + 1) + b; }\n' +
                            'var dir = "' + slideDir + '";\n' +
                            'var offset = [-120, 0];\n' +
                            'if (dir === "right") offset = [120, 0];\n' +
                            'else if (dir === "bottom") offset = [0, 50];\n' +
                            'else if (dir === "top") offset = [0, -50];\n' +
                            'if (time < tStart) value + offset;\n' +
                            'else if (time < tStart + dur) {\n' +
                            '  var factor = 1 - easeOutCubic(time - tStart, 0, 1, dur);\n' +
                            '  value + [offset[0] * factor, offset[1] * factor];\n' +
                            '} else value;';
                    }
                }
            }

            app.endUndoGroup();

            return JSONHelper.stringify({
                success: true,
                plateLayerName: plateLayer.name,
                layersCount: selLayers.length,
                message: "Адаптивная плашка успешно создана для " + selLayers.length + " слоев"
            });
        } catch (e) {
            writeLn("[Broadcast QC] ❌ Ошибка создания Auto-Plate: " + e.toString());
            return JSONHelper.stringify({ success: false, error: e.toString() });
        }
    }
};
