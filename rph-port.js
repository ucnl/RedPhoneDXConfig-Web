// rph-port.js — RPHPort logic for browser

class RPHPort {
    constructor() {
        this.serial = new SerialBridge();
        this.detected = false;
        this.connecting = false;
        this.isWaitingLocal = false;
        this.lastQueryID = null;

        this.defaultTimeoutMs = 1000;
        this.setsTimeoutMs = 3000;
        this.timeoutTimer = null;
        this.timerPeriodMs = 200;
        this.timerCnt = 0;
        this.timerCntMax = 5;

        this.deviceType = null;
        this.serialNumber = '';
        this.systemInfo = '';
        this.systemVersion = '';
        this.isDeviceInfoValid = false;

        this.serial.onMessage = (line) => this._onNMEAMessage(line);
        this.serial.onError = (err) => this._onError(err);
        this.serial.onClose = () => this._onClose();
    }

    async connect(baudRate = 9600) {
        if (this.connecting || this.serial.isOpen) {
            this._log('warning', 'Already connecting or connected');
            return;
        }
        this.connecting = true;
        try {
            await this.serial.open(baudRate);
            await this.serial.sendRaw(new Uint8Array([0x00, 0x00, 0x00]));
            this.queryDINFO();
            this._startTimer(this.defaultTimeoutMs);
        } catch (err) {
            this._log('error', err.message);
            throw err;
        } finally {
            this.connecting = false;
        }
    }

    async disconnect() {
        this._stopTimer();
        await this.serial.close();
        this.detected = false;
        this.isDeviceInfoValid = false;
        this.connecting = false;
        this.isWaitingLocal = false;
        if (this.onStatusChanged) this.onStatusChanged();
    }

    queryDINFO() {
        return this._trySend(NMEA.buildQueryDINFO(), 'DINFO_GET');
    }

    querySETS2Read() {
        return this._trySend(NMEA.buildQuerySETS2Read(), 'SETS');
    }

    querySETS2Write(settings) {
        return this._trySend(NMEA.buildQuerySETS2Write(settings), 'SETS');
    }

    onACKReceived = null;
    onSETSReceived = null;
    onSETS2Received = null;
    onSTMDReceived = null;
    onDeviceInfoChanged = null;
    onStatusChanged = null;
    onLog = null;

    _trySend(message, queryID) {
        if (this.isWaitingLocal) return false;
        try {
            this.serial.send(message);
            this._log('info', `<< ${message.trim()}`);
            const timeout = (queryID === 'SETS') ? this.setsTimeoutMs : this.defaultTimeoutMs;
            this._startTimer(timeout);
            this.isWaitingLocal = true;
            this.lastQueryID = queryID;
            return true;
        } catch (err) {
            this._log('error', `Send error: ${err.message}`);
            return false;
        }
    }

    _onNMEAMessage(rawLine) {
        this._resetTimer();
        this._log('info', `>> ${rawLine.trim()}`);

        const parsed = NMEA.parse(rawLine);
        if (!parsed || !parsed.valid) {
            this._log('error', `Parse error: ${rawLine.trim()}`);
            return;
        }
        if (parsed.manufacturer !== NMEA.MC_RPH) return;

        if (!this.detected && ['0','1','2','3','!','?'].includes(parsed.sentenceId)) {
            this.detected = true;
            this._stopTimer();
            if (this.onStatusChanged) this.onStatusChanged();
        }

        switch (parsed.sentenceId) {
            case '0': this._parseACK(parsed.params); break;
            case '1': this._parseSETS(parsed.params); break;
            case '2': this._parseSETS2(parsed.params); break;
            case '3': this._parseSTMD(parsed.params); break;
            case '!': this._parseDINFO(parsed.params); break;
        }
    }

    _parseACK(params) {
        try {
            const cmdId = params[0];
            const resultId = params[1] !== null ? parseInt(params[1]) : -1;
            this._stopTimer();
            this.isWaitingLocal = false;
            if (this.onACKReceived) this.onACKReceived(cmdId, resultId);
        } catch (err) {
            this._log('error', `Error parsing ACK: ${err.message}`);
        }
    }

    _parseSETS(params) {
        try {
            this._stopTimer();
            this.isWaitingLocal = false;
            if (this.onSETSReceived) {
                this.onSETSReceived({
                    ssbChannelId: params[0] !== null ? parseInt(params[0]) : 16,
                    isRWLT: params[1] !== null ? !!params[1] : false,
                    rwltDiverId: params[2] !== null ? parseInt(params[2]) : 0,
                    rwltChId: params[3] !== null ? parseInt(params[3]) : 0
                });
            }
        } catch (err) {
            this._log('error', `Error parsing SETS: ${err.message}`);
        }
    }

    _parseSETS2(params) {
        try {
            this._stopTimer();
            this.isWaitingLocal = false;
            if (this.onSETS2Received) {
                this.onSETS2Received({
                    flashWrite: params[0] !== null ? !!params[0] : false,
                    ssbChannelId: params[1] !== null ? parseInt(params[1]) : 16,
                    headphoneOutVolume: params[2] !== null ? parseInt(params[2]) : 0,
                    vadSensitivity: params[3] !== null ? parseInt(params[3]) : 0,
                    lowBatteryThresholdV: params[4] !== null ? parseFloat(params[4]) : 0,
                    isRWLT: params[5] !== null ? !!params[5] : false,
                    rwltDiverId: params[6] !== null ? parseInt(params[6]) : 0,
                    flags1: params[7] !== null ? parseInt(params[7]) : 0,
                    reserved1: params[8] !== null ? parseInt(params[8]) : 0,
                    reserved2: params[9] !== null ? parseInt(params[9]) : 0
                });
            }
        } catch (err) {
            this._log('error', `Error parsing SETS2: ${err.message}`);
        }
    }

    _parseSTMD(params) {
        try {
            this._stopTimer();
            if (this.onSTMDReceived) {
                this.onSTMDReceived({
                    ssbChannelId: params[0] !== null ? parseInt(params[0]) : 16,
                    mode: params[1] !== null ? parseInt(params[1]) : 0,
                    reserved1: params[2] !== null ? parseInt(params[2]) : 0,
                    reserved2: params[3] !== null ? parseInt(params[3]) : 0
                });
            }
        } catch (err) {
            this._log('error', `Error parsing STMD: ${err.message}`);
        }
    }

    _parseDINFO(params) {
        try {
            this.deviceType = params[0] !== null ? parseInt(params[0]) : 3;
            this.serialNumber = params[1] !== null ? String(params[1]) : '';
            this.systemInfo = params[2] !== null ? String(params[2]) : '';
            this.systemVersion = this._bcdVersionToStr(params[3] !== null ? parseInt(params[3]) : -1);
            this.isDeviceInfoValid = (this.deviceType !== 3) && (this.serialNumber.length > 0);

            this._stopTimer();
            this.isWaitingLocal = false;

            this._log('info', `Device: type=${this.deviceType}, sn=${this.serialNumber}, ver=${this.systemVersion}, valid=${this.isDeviceInfoValid}`);

            if (this.onDeviceInfoChanged) {
                this.onDeviceInfoChanged();
            }
        } catch (err) {
            this._log('error', `Error parsing DINFO: ${err.message}`);
        }
    }

    _bcdVersionToStr(versionData) {
        if (versionData < 0) return '';
        const major = versionData >> 8;
        const minor = versionData & 0xFF;
        return `${major}.${minor.toString(16).toUpperCase().padStart(2, '0')}`;
    }

    _startTimer(timeoutMs) {
        this._stopTimer();
        this.timerCnt = 0;
        this.timerCntMax = Math.max(1, Math.ceil(timeoutMs / this.timerPeriodMs));
        this.timeoutTimer = setInterval(() => this._timerTick(), this.timerPeriodMs);
    }

    _stopTimer() {
        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
        this.timerCnt = 0;
    }

    _resetTimer() { this.timerCnt = 0; }

    _timerTick() {
        this.timerCnt++;
        if (this.timerCnt >= this.timerCntMax) {
            this._stopTimer();
            if (this.detected) {
                this._log('warning', 'Device timeout');
                this.detected = false;
                if (this.onStatusChanged) this.onStatusChanged();
            }
        }
    }

    _onError(err) { this._log('error', err.message); }

    _onClose() {
        this._log('info', 'Port closed');
        this.detected = false;
        this.isDeviceInfoValid = false;
        this.connecting = false;
        if (this.onStatusChanged) this.onStatusChanged();
    }

    _log(level, message) {
        if (this.onLog) this.onLog(level, message);
    }
}