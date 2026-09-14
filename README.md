# Broadcast QC — Расширение контроля качества для Adobe After Effects и Adobe Premiere Pro

[![Release](https://img.shields.io/github/v/release/daarnix-anim/BroadcastQC?color=00d2ff&label=Release)](https://github.com/daarnix-anim/BroadcastQC/releases)
[![Tests](https://img.shields.io/badge/Tests-52%20Passed-10b981)](https://github.com/daarnix-anim/BroadcastQC)
[![Host](https://img.shields.io/badge/Host-After%20Effects%20%7C%20Premiere%20Pro-blue)](https://www.adobe.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

Профессиональное мультихостовое CEP-расширение для **Adobe After Effects (2021–2026+)** и **Adobe Premiere Pro (2021–2026+)**, предназначенное для автоматизированного контроля качества (Quality Control) эфирных титров, графики Essential Graphics, MOGRT-шаблонов, субтитров (Caption Tracks) и motion-дизайна перед сдачей на ТВ, в эфир и публикацией в соцсети.

---

## ⚡ Ключевые возможности

* 🎬 **Единое мультихостовое расширение (Multi-Host CEP)**: работает одновременно в After Effects и Premiere Pro из одного пакета с автоматическим определением активного приложения и адаптацией интерфейса.
* 📝 **Контроль титров и субтитров в Premiere Pro**:
  * Сканирование графических клипов на видеодорожках (Essential Graphics, Type Tool титры, MOGRT-шаблоны).
  * Сканирование дорожек субтитров (`captionTracks` / Captions Workflow) с проверкой таймкодов, орфографии и скорости чтения.
* ⏱ **Скорость чтения (Reading Speed / CPS)**: расчет символов в секунду (Characters Per Second) и слов в минуту (WPM) против эфирных стандартов (EBU/BBC). Предотвращает ситуации, когда зритель не успевает прочесть титр или субтитр.
* 📖 **Орфография и ТВ-типографика**: масштабный оффлайн-словарь (RU/EN) + гибридный Яндекс.Спеллер, удаление висячих предлогов, расстановка неразрывных пробелов, кавычек-ёлочек и длинных тире.
* ✨ **1-Click Auto-Fix**: мгновенное исправление опечаток в текстовых слоях AE, компонентах Essential Graphics и субтитрах Premiere Pro.
* ⚡ **Адаптивная плашка (Auto-Plate)** *(After Effects)*: параметрическая шейповая плашка под несколько текстовых слоев и объектов с динамическим охватом, независимыми отступами (Paddings), скруглением углов, маскированием (Track Matte) и анимацией появления из 9 опорных точек.
* 📐 **Smart Safe Zone (Соцсети & ТВ)**: непрямоугольные Safe Zone профили для **Instagram Reels/Stories**, **TikTok**, **ВКонтакте Клипов/Историй**, **YouTube Shorts**, **Facebook Reels** и ТВ-стандартов (**EBU R95**, **SMPTE**). Анализ проводится в фазах стабильного текста (Stable States).
* 🚨 **Визуализация красных границ в AE**: создание нерендеримого Guide-слоя с подсветкой интерактивных зон соцсетей (боковые кнопки, шапки, описание).
* 🧠 **AI-Агент (LLM)**: коннектор к локальным моделям (**Ollama**, **LM Studio**) или **OpenAI/DeepSeek API** для выявления смысловых и контекстных ошибок.
* 📄 **Экспорт паспорта качества (HTML)**: генерация официального отчёта ОТК в 1 клик.
* 🔄 **Автообновление через GitHub**: автоматическое уведомление о новых релизах и обновление расширения в 1 клик прямо из панели.

---

## 🚀 Установка

### Быстрая установка (1 клик):
1. Скачайте архив релиза [broadcast-qc-v0.9.2.zip](https://github.com/daarnix-anim/BroadcastQC/releases/latest).
2. Распакуйте архив в любую папку.
3. Запустите файл `install.bat` (или выполните `install.ps1` через PowerShell).
4. Запустите или перезапустите **Adobe After Effects** или **Adobe Premiere Pro**.
5. Откройте расширение:
   * **After Effects**: Меню $\rightarrow$ **Окно $\rightarrow$ Расширения $\rightarrow$ Broadcast QC** (*Window $\rightarrow$ Extensions $\rightarrow$ Broadcast QC*).
   * **Premiere Pro**: Меню $\rightarrow$ **Окно $\rightarrow$ Расширения $\rightarrow$ Broadcast QC** (*Window $\rightarrow$ Extensions $\rightarrow$ Broadcast QC*).

### Удаление:
Запустите `uninstall.bat` (или `uninstall.ps1`), и расширение будет удалено из `%APPDATA%\Adobe\CEP\extensions`.

---

## 🛠 Разработка и тестирование

```bash
# Запуск автоматических тестов (52 теста)
node --test tests/*.test.js

# Сборка релизного мультихостового архива
node scripts/package-release.js
```

---

## 📄 Лицензия

MIT License © 2026 Antigravity
