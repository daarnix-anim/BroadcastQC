# Broadcast QC — Расширение контроля качества для Adobe After Effects 2026.2

[![Release](https://img.shields.io/github/v/release/daarnix-anim/BroadcastQC?color=00d2ff&label=Release)](https://github.com/daarnix-anim/BroadcastQC/releases)
[![Tests](https://img.shields.io/badge/Tests-35%20Passed-10b981)](https://github.com/daarnix-anim/BroadcastQC)
[![Host](https://img.shields.io/badge/Host-After%20Effects%202026.2%2B-blue)](https://www.adobe.com/products/aftereffects.html)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

Профессиональное CEP-расширение для **Adobe After Effects 2026.2+**, предназначенное для автоматизированного контроля качества (Quality Control) титров, плашек и motion-дизайна перед сдачей на ТВ, в эфир и публикацией в соцсети.

---

## ⚡ Ключевые возможности

* 📝 **Орфография и ТВ-типографика**: масштабный оффлайн-словарь (RU/EN) + гибридный Яндекс.Спеллер, удаление висячих предлогов, расстановка неразрывных пробелов, кавычек-ёлочек и длинных тире.
* ✨ **1-Click Auto-Fix & Выпадающий список замен**: мгновенное исправление опечаток прямо в текстовых слоях After Effects с полным сохранением цвета, размера, кернинга и шрифта.
* 📁 **Рекурсивное сканирование Pre-comps и всего проекта**: проверка текстовых слоев во всех вложенных композициях любой глубины и поиск по всему `.aep` проекту.
* 📐 **Smart Safe Zone (Соцсети & ТВ)**: непрямоугольные Safe Zone профили для **Instagram Reels/Stories**, **TikTok**, **ВКонтакте Клипов/Историй**, **YouTube Shorts**, **Facebook Reels** и ТВ-стандартов (**EBU R95**, **SMPTE**). Анализ проводится **в фазах стабильного текста (Stable States)**.
* 🚨 **Визуализация красных границ в AE**: создание нерендеримого Guide-слоя с подсветкой интерактивных зон соцсетей (боковые кнопки, шапки, описание).
* 🧠 **AI-Агент (LLM)**: коннектор к локальным моделям (**Ollama**, **LM Studio**) или **OpenAI/DeepSeek API** для выявления смысловых ошибок.
* 📄 **Экспорт паспорта качества (HTML)**: генерация официального отчёта ОТК в 1 клик.
* 🔄 **Автообновление через GitHub**: автоматическое уведомление о новых релизах и обновление расширения в 1 клик прямо в After Effects.

---

## 🚀 Установка

### Быстрая установка (1 клик):
1. Скачайте архив релиза [broadcast-qc-v0.8.3.zip](https://github.com/daarnix-anim/BroadcastQC/releases/latest).
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
