# Broadcast QC — Спецификация адаптации под Adobe Premiere Pro (Multi-Host Extension)

**Дата:** 2026-09-14  
**Версия:** 1.0.0 (Target Release: v1.0.0)  
**Статус:** Утверждено  

---

## 1. Цель проекта
Превратить расширение **Broadcast QC** из специализированного инструмента для After Effects в единое универсальное расширение (**Multi-Host CEP Extension**), работающее одновременно в **Adobe After Effects** и **Adobe Premiere Pro** (версии 2021–2026+).

Расширение должно предоставлять единый пользовательский опыт, проверять качество эфирной графики, титров (Essential Graphics / MOGRT) и субтитров (Caption Tracks), соблюдая ТВ-стандарты EBU R95 и требования соцсетей.

---

## 2. Архитектура решения

### 2.1. Манифест CEP (`CSXS/manifest.xml`)
Обновление списка хостов:
```xml
<HostList>
    <Host Name="AEFT" Version="[18.0,99.9]" />
    <Host Name="PPRO" Version="[15.0,99.9]" />
</HostList>
```
* Обеспечивает видимость панели в меню `Window -> Extensions -> Broadcast QC` в обоих приложениях.
* Единая точка установки (`%APPDATA%\Adobe\CEP\extensions\com.broadcast.qc`), доступная для всех продуктов Adobe.

---

### 2.2. Host Abstraction Layer (HAL) в ExtendScript (`apps/ae-extension/host/index.jsx`)
Определение хост-приложения осуществляется на лету через `BridgeTalk.appName`:
```javascript
var isPPro = (BridgeTalk.appName === "premierepro");
var isAE = (BridgeTalk.appName === "aftereffects");
```

Интерфейс диспетчера `BroadcastQCHost`:
* `getInfo()` $\rightarrow$ опрашивает активный адаптер и возвращает метаданные проекта/секвенции/композиции.
* `scanProject(mode)` $\rightarrow$ делегирует сбор текстовых элементов `AEHostAdapter` или `PProHostAdapter`.
* `navigateToTime(seconds, itemId)` $\rightarrow$ перемещает CTI (курсор времени) и выделяет элемент.
* `fixText(itemId, newText)` $\rightarrow$ применяет исправление опечатки в исходном слое/компоненте/субтитре.
* `createSocialSafeZoneGuide(presetKey)` $\rightarrow$ в AE создает шейповый guide-слой; в Premiere выводит уведомление/подсказку.

#### Специфика `PProHostAdapter`:
1. **Проект и Секвенция:**
   * Проверка наличия проекта: `app.project`.
   * Активная секвенция: `app.project.activeSequence`.
   * Разрешение кадра: `activeSequence.frameSizeHorizontal`, `activeSequence.frameSizeVertical`.
   * Частота кадров: расчет из `activeSequence.getSettings().videoFrameRate`.
2. **Сканирование видеодорожек (Essential Graphics / MOGRT):**
   * Обход `activeSequence.videoTracks`.
   * Для каждого `trackItem` проверяются компоненты графики (`trackItem.components`), извлекаются текстовые свойства (`text`, шрифт, позиция).
3. **Сканирование дорожек субтитров (Caption Tracks):**
   * Обход `activeSequence.captionTracks` (Premiere Pro 2021+ Speech-to-Text / Captions workflow).
   * Извлечение реплик субтитров с временными метками `inPoint` и `outPoint` (конвертация из Time / Ticks в секунды: `time.seconds`).
4. **Навигация:**
   * `activeSequence.setPlayerPosition(timeTicksOrSeconds)`.

---

### 2.3. Нормализация данных (Data Contract)
Оба адаптера возвращают во фронтенд массив однородных объектов:
```typescript
interface NormalizedLayer {
    id: string | number;
    name: string;
    type: 'text' | 'caption' | 'graphic';
    text: string;
    inPoint: number;       // секунды
    outPoint: number;      // секунды
    duration: number;      // секунды
    width: number;         // ширина кадра/композиции
    height: number;        // высота кадра/композиции
    bounds: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    compName: string;      // имя композиции или секвенции
    isCaption?: boolean;
    trackIndex?: number;
}
```

---

### 2.4. Клиентский интерфейс (`apps/ae-extension/client/`)
1. **Автоопределение хоста:**
   * При инициализации `main.js` считывает `csInterface.getHostEnvironment().appId`.
   * Устанавливает контекст: `"PPRO"` или `"AEFT"`.
2. **Адаптация UI:**
   * Верхний бейдж меняется на `Premiere Pro 2026` / `After Effects 2026`.
   * Терминология: "Композиция" $\rightarrow$ "Секвенция", "Слои" $\rightarrow$ "Клипы и субтитры".
   * Вкладка **Auto-Plate**: при запуске в Premiere Pro показывает аккуратный баннер с информацией:
     *"Функция адаптивной шейповой плашки (Auto-Plate) использует движок выражений After Effects. Доступна при запуске Broadcast QC в After Effects."*
3. **Полный функционал QC для Premiere Pro:**
   * Проверка орфографии (оффлайн словарь + Яндекс.Спеллер).
   * ТВ-типографика (кавычки, тире, висячие предлоги).
   * Скорость чтения (Reading Speed / CPS) для субтитров и титров.
   * Проверка Safe Zone (EBU R95, SMPTE, Reels, TikTok, Shorts).
   * Экспорт отчета ОТК (HTML).
   * Автообновление плагина через GitHub.

---

## 3. План тестирования и верификации
1. Модульные тесты нормализации данных Premiere Pro (видеодорожки + субтитры).
2. Тесты целостности манифеста CSXS (поддержка `AEFT` и `PPRO`).
3. Тесты совместимости ядра `qc-core` с объектами субтитров и титров.
4. Прогон всех 45+ существующих тестов (отсутствие регрессий).
5. Проверка упаковки релиза (`npm run package`).
