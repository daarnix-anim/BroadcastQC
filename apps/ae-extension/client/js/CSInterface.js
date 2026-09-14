/**
 * CSInterface - Enhanced v11.0.0 for Adobe After Effects 2026.2+
 * Handles CEP communication, automatic JSX loading, and robust mock fallbacks for standalone testing.
 */
function CSInterface() {
    this.isCEP = typeof window.__adobe_cep__ !== "undefined";
}

CSInterface.prototype.SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

CSInterface.prototype.evalScript = function(script, callback) {
    if (this.isCEP) {
        window.__adobe_cep__.evalScript(script, function(result) {
            if (typeof callback === "function") {
                callback(result);
            }
        });
    } else {
        console.warn("[CSInterface Mock] evalScript ->", script.substring(0, 100) + (script.length > 100 ? "..." : ""));
        if (typeof callback === "function") {
            setTimeout(function() {
                if (script.indexOf("scanActiveComposition") !== -1) {
                    callback(JSON.stringify({
                        success: true,
                        composition: { id: 1, name: "Broadcast_Promo_1080p", width: 1920, height: 1080, duration: 10.0, frameRate: 30, workAreaStart: 0, workAreaDuration: 10.0 },
                        layers: [
                            {
                                id: 1, index: 1, name: "Title_Main", inPoint: 0.5, outPoint: 6.5,
                                text: "Инновационная програма для ТВ",
                                font: "HelveticaNeue-Bold", fontSize: 64, enabled: true, locked: false, shy: false, guideLayer: false,
                                samples: [
                                    { time: 2.0, position: [960, 540, 0], scale: [100, 100], opacity: 100, rotation: 0, compAABB: { left: 400, top: 400, right: 1520, bottom: 580, width: 1120, height: 180 }, text: "Инновационная програма для ТВ" },
                                    { time: 4.0, position: [960, 540, 0], scale: [100, 100], opacity: 100, rotation: 0, compAABB: { left: 400, top: 400, right: 1520, bottom: 580, width: 1120, height: 180 }, text: "Инновационная програма для ТВ" }
                                ]
                            },
                            {
                                id: 2, index: 2, name: "Lower_Third_Info", inPoint: 2.0, outPoint: 8.0,
                                text: "Смотрите в эфире на\nПервом канале с 31 февраля",
                                font: "Arial-Regular", fontSize: 36, enabled: true, locked: false, shy: false, guideLayer: false,
                                samples: [
                                    { time: 4.0, position: [150, 1030, 0], scale: [100, 100], opacity: 100, rotation: 0, compAABB: { left: 50, top: 970, right: 800, bottom: 1050, width: 750, height: 80 }, text: "Смотрите в эфире на\nПервом канале с 31 февраля" },
                                    { time: 6.0, position: [150, 1030, 0], scale: [100, 100], opacity: 100, rotation: 0, compAABB: { left: 50, top: 970, right: 800, bottom: 1050, width: 750, height: 80 }, text: "Смотрите в эфире на\nПервом канале с 31 февраля" }
                                ]
                            },
                            {
                                id: 3, index: 3, name: "Disclaimer_Guide", inPoint: 0, outPoint: 10.0,
                                text: "Технический драфт",
                                font: "AdobeBlank", fontSize: 24, enabled: true, locked: false, shy: false, guideLayer: true,
                                samples: [
                                    { time: 1.0, position: [960, 900, 0], scale: [100, 100], opacity: 100, rotation: 0, compAABB: { left: 800, top: 880, right: 1120, bottom: 920, width: 320, height: 40 }, text: "Технический драфт" }
                                ]
                            }
                        ]
                    }));
                } else if (script.indexOf("getInfo") !== -1) {
                    callback(JSON.stringify({
                        appVersion: "26.2.0",
                        appName: "After Effects",
                        hasProject: true,
                        projectName: "Commercial_2026.aep",
                        activeCompName: "Broadcast_Promo_1080p",
                        activeCompLayers: 6,
                        activeCompTextLayers: 3
                    }));
                } else if (script.indexOf("applyTextFix") !== -1) {
                    callback(JSON.stringify({ success: true, updatedText: "Исправленный текст" }));
                } else if (script.indexOf("navigateToLayer") !== -1) {
                    callback(JSON.stringify({ success: true }));
                } else if (script.indexOf("updateAutoPlate") !== -1) {
                    callback(JSON.stringify({ success: true, plateLayerName: "[Plate] Title_Main", message: "Плашка «[Plate] Title_Main» успешно обновлена (охватывает 3 слоя)" }));
                } else if (script.indexOf("createAutoPlate") !== -1) {
                    callback(JSON.stringify({ success: true, plateLayerName: "[Plate] Title_Main", message: "Адаптивная плашка успешно создана для 2 слоев" }));
                } else {
                    callback(JSON.stringify({ success: true }));
                }
            }, 60);
        }
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (this.isCEP && window.__adobe_cep__.getSystemPath) {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};

CSInterface.prototype.loadJSX = function(jsxRelativePath, callback) {
    if (!this.isCEP) {
        if (typeof callback === "function") callback("mock_loaded");
        return;
    }
    var extensionPath = this.getSystemPath(this.SystemPath.EXTENSION);
    var fullPath = (extensionPath + "/" + jsxRelativePath).replace(/\\/g, "/");
    var script = 'try { $.evalFile("' + fullPath + '"); "loaded"; } catch(e) { "error: " + e.toString(); }';
    this.evalScript(script, callback);
};

CSInterface.prototype.getHostEnvironment = function() {
    if (this.isCEP && window.__adobe_cep__.getHostEnvironment) {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return { appName: "AEFT", appVersion: "26.2.0", isStandalone: true };
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (this.isCEP && window.cep && window.cep.util) {
        window.cep.util.openURLInDefaultBrowser(url);
    } else {
        window.open(url, "_blank");
    }
};

CSInterface.prototype.closeExtension = function() {
    if (this.isCEP && window.__adobe_cep__.closeExtension) {
        window.__adobe_cep__.closeExtension();
    }
};
