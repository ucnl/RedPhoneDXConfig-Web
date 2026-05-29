// app.js - RedPhone DX Config (Web Serial Edition)

class DeviceConfig {
    constructor() {
        this.rph = new RPHPort();
        this.isConnected = false;
        this.deviceInfo = null;
        this.maxLogEntries = 32;

        this._wireRPHEvents();
        this._initAllListeners();
        this.updateUI();
        this.setDefaultFlags();
		this._initFlashWriteDefault();
        this._initLogToggle();
        this._initLangSwitch();
    }

	_initFlashWriteDefault() {
		document.getElementById('flashWrite').checked = true;
	}

    // ==================== RPH Events ====================

    _wireRPHEvents() {
        this.rph.onLog = (level, message) => this.addLog(message, level);

        this.rph.onDeviceInfoChanged = () => {
            this.deviceInfo = {
                isValid: this.rph.isDeviceInfoValid,
                deviceType: this.rph.deviceType,
                serialNumber: this.rph.serialNumber,
                systemInfo: this.rph.systemInfo,
                systemVersion: this.rph.systemVersion
            };
            this.handleDeviceStatus(this.deviceInfo);

           // Авто-запрос настроек после обнаружения устройства
           if (this.deviceInfo.isValid) {
               setTimeout(() => this.rph.querySETS2Read(), 300);
    }
        };

        this.rph.onSETS2Received = (data) => {
            this.handleSettings(data);
            this.addLog(I18n.translate('log_settings_read'), 'success');
        };

        this.rph.onACKReceived = (cmdId, resultId) => {
            if (resultId === 0) {
                this.addLog(I18n.translate('log_settings_saved'), 'success');
                setTimeout(() => { if (this.rph.detected) this.rph.querySETS2Read(); }, 500);
            } else {
                this.addLog(`${I18n.translate('log_error')}${resultId}`, 'error');
            }
        };

        this.rph.onStatusChanged = () => {
            const detected = this.rph.detected;
            const portOpen = this.rph.serial.isOpen;

            if (detected) {
                this.isConnected = true;
                this.updateConnectionStatus('connected');
                this._setConnectButtons(true);
            } else if (portOpen) {
                this.isConnected = false;
                this.updateConnectionStatus('busy');
                this._setConnectButtons(true);
            } else {
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
                this._setConnectButtons(false);
            }

            // Update indicator and text
            const indicator = document.querySelector('.connect-indicator');
            const statusText = document.getElementById('connectStatusText');

            if (detected) {
                if (indicator) indicator.className = 'connect-indicator connected';
                if (statusText) statusText.textContent = I18n.translate('device_connected');
            } else if (portOpen) {
                if (indicator) indicator.className = 'connect-indicator disconnected';
                if (statusText) statusText.textContent = I18n.translate('auto_connecting');
            } else {
                if (indicator) indicator.className = 'connect-indicator disconnected';
                if (statusText) statusText.textContent = I18n.translate('device_not_found');
            }

            this.updateUI();
        };
    }

    // ==================== Init ====================

    _initAllListeners() {
        // Connect / Disconnect
        document.getElementById('btnConnect').addEventListener('click', () => this._connect());
        document.getElementById('btnDisconnect').addEventListener('click', () => this._disconnect());

        // Sliders
        document.getElementById('headphoneVolume').addEventListener('input', (e) => {
            document.getElementById('headphoneVolumeValue').textContent = e.target.value + '%';
        });
        document.getElementById('vadSensitivity').addEventListener('input', (e) => {
            document.getElementById('vadSensitivityValue').textContent = e.target.value + '%';
        });

        // RWLT toggle
        document.getElementById('isRWLT').addEventListener('change', (e) => {
            document.getElementById('rwltGroup').style.display = e.target.checked ? 'block' : 'none';
        });

        // Flags
        for (let i = 0; i < 8; i++) {
            document.getElementById(`flag${i}`).addEventListener('change', () => this.updateFlagsHexValue());
        }

        // Read / Save buttons
        document.getElementById('btnReadSettings').onclick = () => this.readSettings();
        document.getElementById('btnSaveSettings').onclick = () => this.saveSettings();
    }

    _initLogToggle() {
        const logPanel = document.querySelector('.log-panel');
        const logHeader = logPanel ? logPanel.querySelector('h2') : null;
        const logContainer = document.getElementById('logContainer');

        if (!logHeader || !logContainer) return;

        logHeader.style.cursor = 'pointer';
        logHeader.style.userSelect = 'none';
        logContainer.style.display = 'none';

        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'log-toggle-icon';
        toggleIcon.textContent = ' ▶';
        logHeader.appendChild(toggleIcon);

        logHeader.addEventListener('click', () => {
            if (logContainer.style.display === 'none') {
                logContainer.style.display = 'block';
                toggleIcon.textContent = ' ▼';
                logContainer.scrollTop = logContainer.scrollHeight;
            } else {
                logContainer.style.display = 'none';
                toggleIcon.textContent = ' ▶';
            }
        });
    }

    _initLangSwitch() {
        document.getElementById('langSelector').addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            // Update dynamic texts that i18n might have missed
            this.updateConnectionStatus(this.isConnected ? 'connected' : 'disconnected');
            if (this.deviceInfo) this.handleDeviceStatus(this.deviceInfo);
        });
    }

    // ==================== Connect / Disconnect ====================

    async _connect() {
        if (this.rph.connecting || this.rph.serial.isOpen) return;

        const btn = document.getElementById('btnConnect');
        btn.disabled = true;
        btn.textContent = '...';
        this.addLog(I18n.translate('log_connecting'), 'info');

        try {
            await this.rph.connect(9600);
        } catch (err) {
            this.addLog(I18n.translate('log_error') + err.message, 'error');
            btn.disabled = false;
            btn.textContent = I18n.translate('connect');
        }
    }

    async _disconnect() {
        await this.rph.disconnect();
        this.deviceInfo = null;
        this._setConnectButtons(false);
        this._clearDeviceInfo();
        this.updateUI();
    }

    _setConnectButtons(connected) {
        const btnConnect = document.getElementById('btnConnect');
        const btnDisconnect = document.getElementById('btnDisconnect');
        btnConnect.disabled = connected;
        btnConnect.textContent = I18n.translate('connect');
        btnDisconnect.disabled = !connected;
    }

    _clearDeviceInfo() {
        document.getElementById('deviceType').textContent = '-';
        document.getElementById('serialNumber').textContent = '-';
        document.getElementById('firmwareVersion').textContent = '-';
    }

    // ==================== Device Status ====================

    handleDeviceStatus(data) {
        if (data.isValid) {
            document.getElementById('deviceType').textContent = this.getDeviceTypeName(data.deviceType);
            document.getElementById('serialNumber').textContent = data.serialNumber || '-';
            document.getElementById('firmwareVersion').textContent = data.systemVersion || '-';
            document.getElementById('btnReadSettings').disabled = false;
            document.getElementById('btnSaveSettings').disabled = false;
        } else {
            this._clearDeviceInfo();
            document.getElementById('btnReadSettings').disabled = true;
            document.getElementById('btnSaveSettings').disabled = true;
        }
    }

    handleSettings(data) {
        const channelId = (data.ssbChannelId != null && data.ssbChannelId !== 16) ? data.ssbChannelId : 16;
        document.getElementById('ssbChannel').value = channelId;
        document.getElementById('headphoneVolume').value = data.headphoneOutVolume ?? 100;
        document.getElementById('headphoneVolumeValue').textContent = (data.headphoneOutVolume ?? 100) + '%';
        document.getElementById('vadSensitivity').value = data.vadSensitivity ?? 100;
        document.getElementById('vadSensitivityValue').textContent = (data.vadSensitivity ?? 100) + '%';
        document.getElementById('lowBatteryThreshold').value = data.lowBatteryThresholdV ?? 12.0;
        document.getElementById('isRWLT').checked = data.isRWLT ?? false;
        document.getElementById('rwltGroup').style.display = data.isRWLT ? 'block' : 'none';
        document.getElementById('rwltDiverId').value = data.rwltDiverId ?? 0;
        //document.getElementById('flashWrite').checked = data.flashWrite ?? false;
        this.setFlagsFromValue(data.flags1 ?? 0);
    }

    // ==================== Settings I/O ====================

    readSettings() {
        if (!this.rph.detected) {
            this.addLog(I18n.translate('device_not_found'), 'error');
            return;
        }
        this.rph.querySETS2Read();
    }

    saveSettings() {
        if (!this.rph.detected) {
            this.addLog(I18n.translate('device_not_found'), 'error');
            return;
        }
        if (!this._validateForm()) return;

        const settings = {
            flashWrite: document.getElementById('flashWrite').checked,
            ssbChannelId: parseInt(document.getElementById('ssbChannel').value),
            headphoneOutVolume: parseInt(document.getElementById('headphoneVolume').value),
            vadSensitivity: parseInt(document.getElementById('vadSensitivity').value),
            lowBatteryThresholdV: parseFloat(document.getElementById('lowBatteryThreshold').value),
            isRWLT: document.getElementById('isRWLT').checked,
            rwltDiverId: parseInt(document.getElementById('rwltDiverId').value),
            flags1: this.getFlagsValue()
        };

        this.rph.querySETS2Write(settings);
    }

    // ==================== UI Helpers ====================

    updateConnectionStatus(status) {
        const badge = document.getElementById('connectionStatus');
        badge.className = 'status-badge ' + status;
        badge.textContent = I18n.translate('status_' + status);
    }

    updateUI() {
        const hasDevice = this.deviceInfo && this.deviceInfo.isValid;
        document.getElementById('btnReadSettings').disabled = !hasDevice;
        document.getElementById('btnSaveSettings').disabled = !hasDevice;
    }

    getDeviceTypeName(type) {
        const types = {
            0: 'device_dx',
            1: 'device_oem',
            2: 'device_os',
            3: 'device_unknown'
        };
        return I18n.translate(types[type] || 'device_unknown');
    }

    // ==================== Flags ====================

    setDefaultFlags() { this.setFlagsFromValue(129); }

    setFlagsFromValue(value) {
        for (let i = 0; i < 8; i++) {
            const cb = document.getElementById(`flag${i}`);
            if (cb) cb.checked = (value & (1 << i)) !== 0;
        }
        this.updateFlagsHexValue();
    }

    getFlagsValue() {
        let value = 0;
        for (let i = 0; i < 8; i++) {
            const cb = document.getElementById(`flag${i}`);
            if (cb && cb.checked) value |= (1 << i);
        }
        return value;
    }

    updateFlagsHexValue() {
        const value = this.getFlagsValue();
        document.getElementById('flagsHexValue').textContent =
            '0x' + value.toString(16).toUpperCase().padStart(2, '0');
    }

    // ==================== Validation ====================

    _validateForm() {
        const lowBattery = parseFloat(document.getElementById('lowBatteryThreshold').value);
        const rwltDiverId = parseInt(document.getElementById('rwltDiverId').value);
        const isRWLT = document.getElementById('isRWLT').checked;

        if (isNaN(lowBattery) || lowBattery < 4.0 || lowBattery > 20.0) {
            this.addLog(I18n.translate('log_error') + '4.0 – 20.0 V', 'error');
            return false;
        }
        if (isRWLT && (isNaN(rwltDiverId) || rwltDiverId < 0 || rwltDiverId > 255)) {
            this.addLog(I18n.translate('log_error') + 'ID 0 – 255', 'error');
            return false;
        }
        return true;
    }

    // ==================== Log ====================

    addLog(message, type = '') {
        const logContainer = document.getElementById('logContainer');
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        while (logContainer.children.length > this.maxLogEntries) {
            logContainer.removeChild(logContainer.firstChild);
        }
    }
}

// ==================== Startup ====================

document.addEventListener('DOMContentLoaded', () => {
    window.deviceConfig = new DeviceConfig();
});