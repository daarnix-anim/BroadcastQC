# Broadcast QC 2.0 — Расширение контроля качества для Adobe After Effects 2026.2

[![Release](https://img.shields.io/github/v/release/daarnix-anim/BroadcastQC?color=00d2ff&label=Release)](https://github.com/daarnix-anim/BroadcastQC/releases)
[![Tests](https://img.shields.io/badge/Tests-27%20Passed-10b981)](https://github.com/daarnix-anim/BroadcastQC)
[![Host](https://img.shields.io/badge/Host-After%20Effects%202026.2%2B-blue)](https://www.adobe.com/products/aftereffects.html)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

Профессиональное CEP-расширение для **Adobe After Effects 2026.2+**, предназначенное для автоматизированного контроля качества (Quality Control) титров, плашек и motion-дизайна перед сдачей на ТВ и в эфир.

---

## ⚡ Ключевые возможности

* 📝 **Орфография и ТВ-типографика**: оффлайн-проверка правописания (RU/EN), удаление висячих предлогов, расстановка неразрывных пробелов, кавычек-ёлочек и длинных тире.
* ✨ **1-Click Auto-Fix**: мгновенное исправление опечаток прямо в текстовых слоях After Effects с полным сохранением цвета, размера, кернинга и шрифта.
* 📐 **Smart Safe Zone (EBU R95 / SMPTE)**: проверка безопасных зон для форматов 16:9 и 9:16. Анализ проводится **только в фазах стабильного текста (Stable States)** без ложных срабатываний во время динамической анимации влёта/вылета.
* ⏱ **Reading Speed QC**: проверка времени удержания титра на экране по стандартам вещания (CPS — символов в секунду, WPM — слов в минуту).
* 🔍 **Project Health QC**: технический аудит композиции — поиск забытых **Guide Layers**, слетевших шрифтов (**Missing Fonts / AdobeBlank**) и пустых слоёв.
* 🧠 **AI-Агент (LLM)**: коннектор к локальным моделям (**Ollama**, **LM Studio**) или **OpenAI/DeepSeek API** для выявления смысловых ошибок («31 февраля», несогласованность падежей).
* 📄 **Экспорт паспорта качества (HTML/PDF)**: генерация официального отчёта ОТК в 1 клик.
* 🔄 **Автообновление через GitHub**: автоматическое уведомление о новых релизах и обновление расширения в 1 клик прямо в After Effects.

---

## 🚀 Установка

### Быстрая установка (1 клик):
1. Скачайте архив релиза [broadcast-qc-v2.0.0.zip](https://github.com/daarnix-anim/BroadcastQC/releases/latest).
2. Распакуйте архив в любую папку.
3. Запустите файл `install.bat` (или выполните `install.ps1` через PowerShell).
4. Запустите или перезапустите **Adobe After Effects 2026**.
5. Откройте расширение: **Окно $\rightarrow$ Расширения $\rightarrow$ Broadcast QC** (*Window $\rightarrow$ Extensions $\rightarrow$ Broadcast QC*).

### Удаление:
Запустите `uninstall.bat` (или `uninstall.ps1`), и расширение будет удалено из `%APPDATA%\Adobe\CEP\extensions`.

---

## 🛠 Разработка и тестирование

```bash
# Запуск автоматических тестов
npm test

# Сборка релизного архива
npm run package
```

---

## 📄 Лицензия

MIT License © 2026 Antigravity
