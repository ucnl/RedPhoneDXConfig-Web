// i18n.js — RedPhone DX Config

const I18n = {
    currentLang: 'ru',

    translations: {
        ru: {
            // Status
            status_disconnected: 'Отключено',
            status_connected: 'Подключено',
            status_busy: 'Занято',

            // Connection panel
            connection_title: 'Подключение',
            device_type: 'Тип устройства:',
            serial_number: 'Серийный номер:',
            firmware_version: 'Версия прошивки:',
            connect: 'Подключить',
            disconnect: 'Отключить',
            device_connected: 'Устройство подключено',
            device_not_found: 'Устройство не найдено',
            auto_connecting: 'Поиск устройства...',

            // Settings panel
            settings_title: 'Настройки SETS2',
            ssb_channel: 'SSB канал:',
            headphone_volume: 'Громкость эффектов:',
            vad_sensitivity: 'Чувствительность VAD:',
            low_battery_threshold: 'Порог низкого заряда (В):',
            voltage_range: '4.0 – 20.0 V',
            rwlt_mode: 'Режим RWLT',
            rwlt_diver_id: 'ID водолаза RWLT:',
            diver_id_range: '0 – 255',
            flash_write: 'Записать во flash',
            read_settings: 'Прочитать настройки',
            save_settings: 'Сохранить настройки',

            // Flags
            flags_title: 'Флаги (Flags1):',
            flag0: 'Игнорировать номер канала',
            flag1: 'Бит 1',
            flag2: 'Бит 2',
            flag3: 'Бит 3',
            flag4: 'Бит 4',
            flag5: 'Бит 5',
            flag6: 'Бит 6',
            flag7: 'Индикатор канала',
            flags_hex_value: 'Значение (hex):',

            // Device types
            device_unknown: 'Неизвестно',
            device_dx: 'Водолазная станция (DX)',
            device_oem: 'OEM-версия',
            device_os: 'Надводная станция (OS)',
            channel_invalid: 'Не выбран',

            // Log
            log_title: 'Лог обмена',
            log_ready: 'Готов к работе...',
            log_connected: 'Устройство подключено',
            log_disconnected: 'Устройство отключено',
            log_connecting: 'Подключение к устройству...',
            log_device_found: 'Устройство обнаружено',
            log_settings_read: 'Настройки прочитаны',
            log_settings_saved: 'Настройки сохранены',
            log_error: 'Ошибка: ',
            log_port_open: 'Порт открыт',
            log_port_closed: 'Порт закрыт',
            log_send: '>>',
            log_recv: '<<',

            // Footer
            org_name: 'UC&NL',
            footer_desc: 'Инструмент конфигурации с открытым исходным кодом',
        },

        en: {
            // Status
            status_disconnected: 'Disconnected',
            status_connected: 'Connected',
            status_busy: 'Busy',

            // Connection panel
            connection_title: 'Connection',
            device_type: 'Device type:',
            serial_number: 'Serial number:',
            firmware_version: 'Firmware version:',
            connect: 'Connect',
            disconnect: 'Disconnect',
            device_connected: 'Device connected',
            device_not_found: 'Device not found',
            auto_connecting: 'Searching for device...',

            // Settings panel
            settings_title: 'SETS2 Settings',
            ssb_channel: 'SSB Channel:',
            headphone_volume: 'Effects Volume:',
            vad_sensitivity: 'VAD Sensitivity:',
            low_battery_threshold: 'Low Battery Threshold (V):',
            voltage_range: '4.0 – 20.0 V',
            rwlt_mode: 'RWLT Mode',
            rwlt_diver_id: 'RWLT Diver ID:',
            diver_id_range: '0 – 255',
            flash_write: 'Write to Flash',
            read_settings: 'Read Settings',
            save_settings: 'Save Settings',

            // Flags
            flags_title: 'Flags (Flags1):',
            flag0: 'PinsPrevail',
            flag1: 'Bit 1',
            flag2: 'Bit 2',
            flag3: 'Bit 3',
            flag4: 'Bit 4',
            flag5: 'Bit 5',
            flag6: 'Bit 6',
            flag7: 'CH Indicator',
            flags_hex_value: 'Value (hex):',

            // Device types
            device_unknown: 'Unknown',
            device_dx: 'Diver Device (DX)',
            device_oem: 'OEM Version',
            device_os: 'Surface Station (OS)',
            channel_invalid: 'Not selected',

            // Log
            log_title: 'Exchange Log',
            log_ready: 'Ready...',
            log_connected: 'Device connected',
            log_disconnected: 'Device disconnected',
            log_connecting: 'Connecting to device...',
            log_device_found: 'Device found',
            log_settings_read: 'Settings read',
            log_settings_saved: 'Settings saved',
            log_error: 'Error: ',
            log_port_open: 'Port opened',
            log_port_closed: 'Port closed',
            log_send: '>>',
            log_recv: '<<',

            // Footer
            org_name: 'UC&NL',
            footer_desc: 'Open Source Configuration Tool',
        }
    },

    init() {
        const savedLang = localStorage.getItem('lang');
        if (savedLang) {
            this.currentLang = savedLang;
        } else {
            const browserLang = navigator.language || navigator.userLanguage;
            this.currentLang = browserLang.startsWith('ru') ? 'ru' : 'en';
        }

        const langSelector = document.getElementById('langSelector');
        if (langSelector) {
            langSelector.value = this.currentLang;
        }
        this.apply();
    },

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('lang', lang);
        this.apply();
    },

    apply() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.textContent = this.translations[this.currentLang][key];
            }
        });
    },

    translate(key) {
        if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
            return this.translations[this.currentLang][key];
        }
        return key;
    }
};

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();

    const langSelector = document.getElementById('langSelector');
    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
        });
    }
});