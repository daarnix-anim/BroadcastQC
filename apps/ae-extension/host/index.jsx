/**
 * Broadcast QC 2.0 - ExtendScript Host Adapter for Adobe After Effects 2026.2+
 * Runs inside After Effects scripting engine (ES3).
 * Provides live logging to AE Info Panel (writeLn) and status bar updates.
 */

// Basic JSON serialization support for ExtendScript (ES3)
var JSONHelper = {
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
    scanActiveComposition: function(sampleStepFrames) {
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

            writeLn("[Broadcast QC] ⚡ Запуск анализа композиции: '" + comp.name + "' (" + comp.width + "x" + comp.height + ", " + comp.numLayers + " слоёв)...");

            var stepFrames = sampleStepFrames || 5;
            var frameDuration = comp.frameDuration;
            var stepSeconds = stepFrames * frameDuration;
            var fps = 1.0 / frameDuration;

            var result = {
                success: true,
                composition: {
                    id: comp.id,
                    name: comp.name,
                    width: comp.width,
                    height: comp.height,
                    duration: comp.duration,
                    frameRate: Math.round(fps),
                    workAreaStart: comp.workAreaStart,
                    workAreaDuration: comp.workAreaDuration
                },
                layers: [],
                totalCompLayers: comp.numLayers,
                textLayersCount: 0
            };

            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);

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

                // 1. Сбор вариаций текста при наличии ключевых кадров на Source Text
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

                // 2. Сэмплирование геометрии слоя во времени
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

                result.layers.push(layerData);
            }

            result.textLayersCount = result.layers.length;

            if (result.layers.length === 0) {
                writeLn("[Broadcast QC] ⚠️ В композиции '" + comp.name + "' не найдено текстовых слоёв (всего слоёв: " + comp.numLayers + ").");
            } else {
                writeLn("[Broadcast QC] ✅ Сканирование завершено: собрано " + result.layers.length + " текстовых слоёв.");
            }

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
     * Автоматическое 1-Click исправление текста в слое с сохранением стилей
     */
    applyTextFix: function(layerIndex, oldText, newText) {
        try {
            if (!app.project || !app.project.activeItem) {
                return JSONHelper.stringify({ success: false, error: "Нет активной композиции" });
            }

            var comp = app.project.activeItem;
            var idx = parseInt(layerIndex, 10);
            if (idx < 1 || idx > comp.numLayers) {
                return JSONHelper.stringify({ success: false, error: "Слой #" + idx + " не найден в композиции" });
            }

            var layer = comp.layer(idx);
            var sourceTextProp = layer.property("Source Text");
            if (!sourceTextProp) {
                return JSONHelper.stringify({ success: false, error: "Слой #" + idx + " не является текстовым" });
            }

            app.beginUndoGroup("Broadcast QC: Авто-исправление текста");

            var textDoc = sourceTextProp.value;
            var currentText = textDoc.text;

            if (oldText && newText) {
                textDoc.text = currentText.split(oldText).join(newText);
            } else if (newText) {
                textDoc.text = newText;
            }

            sourceTextProp.setValue(textDoc);

            app.endUndoGroup();

            writeLn("[Broadcast QC] ✨ Исправлен текст в слое #" + idx + " ('" + layer.name + "'): '" + oldText + "' -> '" + newText + "'");

            return JSONHelper.stringify({
                success: true,
                layerIndex: idx,
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
    navigateToLayer: function(layerIndex, timeInSeconds) {
        try {
            if (!app.project || !app.project.activeItem) {
                return JSONHelper.stringify({ success: false, error: "Нет активной композиции" });
            }

            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) {
                return JSONHelper.stringify({ success: false, error: "Активный элемент не является композицией" });
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
                writeLn("[Broadcast QC] 🎯 Выделен слой #" + idx + " ('" + selLayer.name + "') на таймкоде " + (timeInSeconds || 0).toFixed(2) + "с");
            }

            return JSONHelper.stringify({ success: true });
        } catch (e) {
            return JSONHelper.stringify({ success: false, error: e.toString() });
        }
    }
};
