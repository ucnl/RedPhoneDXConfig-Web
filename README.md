# 🤿 RedPhone DX Config — Web Edition

Браузерный конфигуратор для [RedPhone DX](https://docs.unavlab.com/underwater_wireless_voice_systems_ru.html) — устройства подводной голосовой связи.

**Работает прямо в браузере. Установка не требуется.**

➡️ **[Открыть конфигуратор](https://ucnl.github.io/RedPhoneDXConfig-Web/)**


## Возможности
- Чтение и запись настроек устройства (SETS2)
- Выбор SSB-канала
- Настройка громкости, чувствительности VAD, порога низкого заряда
- Управление флагами
- Режим RWLT с указанием ID водолаза
- Запись конфигурации во Flash-память устройства

## Требования
- **Браузер:** Chrome, Edge, Opera (поддержка [Web Serial API](https://caniuse.com/web-serial))
- **Устройство:** USB-донгл RedPhone DX

> Safari и Firefox (стабильный) не поддерживают Web Serial API.

## Как использовать
1. Подключите USB-донгл к компьютеру
2. Откройте [конфигуратор](https://ucnl.github.io/RedPhoneDXConfig-Web/)
3. Нажмите **Подключить** и выберите порт донгла
4. После обнаружения устройства настройки загрузятся автоматически
5. Измените нужные параметры и нажмите **Сохранить настройки**

## Связанные проекты
- [Десктопный конфигуратор (C#)](https://github.com/ucnl/RedPhoneDXConfig)
- [Документация RedPhone DX](https://docs.unavlab.com/underwater_wireless_voice_systems_ru.html)

## Лицензия
GNU GPL v3.0 © [UC&NL](https://github.com/ucnl)

