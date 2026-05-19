// serial-bridge.js — Web Serial API wrapper with NMEA buffering
// Replaces NMEASerialPort

class SerialBridge {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isOpen = false;
        this.readLoopAbort = null;

        // NMEA line buffer (replaces NMEAPort.OnIncomingDataEx)
        this.lineBuffer = '';

        // Callbacks
        this.onMessage = null;    // (rawLine: string) => void
        this.onError = null;      // (error: Error) => void
        this.onClose = null;      // () => void
        this.onRawData = null;    // (data: Uint8Array) => void
    }

    /**
     * Request port from user and open it
     * @param {number} baudRate - defaults to 9600
     */
    async open(baudRate = 9600) {
        try {
            // Request port — must be triggered by user gesture
            this.port = await navigator.serial.requestPort();

            await this.port.open({
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });

            this.isOpen = true;
            this.writer = this.port.writable.getWriter();
            this.reader = this.port.readable.getReader();
            this.lineBuffer = '';

            // Start async read loop
            this.readLoopAbort = new AbortController();
            this._readLoop();

            return true;
        } catch (err) {
            this.isOpen = false;
            if (this.onError) this.onError(err);
            throw err;
        }
    }

    /**
     * Send raw string to port (like NMEASerialPort.SendData)
     * @param {string} message
     */
    async send(message) {
        if (!this.writer) throw new Error('Port not open');

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        await this.writer.write(data);

        // Also send raw zeros like TryNextPort does
        // (this was in uAuxPort.TryNextPort: port.SendRaw(new byte[] { 0x00, 0x00, 0x00 }))
    }

    /**
     * Send raw bytes
     * @param {Uint8Array} data
     */
    async sendRaw(data) {
        if (!this.writer) throw new Error('Port not open');
        await this.writer.write(data);
    }

    /**
     * Internal read loop - accumulates bytes into NMEA lines
     */
    async _readLoop() {
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;

                // Raw data callback
                if (this.onRawData) {
                    this.onRawData(value);
                }

                // Decode and accumulate
                buffer += decoder.decode(value, { stream: true });

                // Extract complete NMEA lines (ending with \n)
                let newlineIdx;
                while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.substring(0, newlineIdx + 1); // include \n
                    buffer = buffer.substring(newlineIdx + 1);

                    // Fire message event (like NewNMEAMessage)
                    if (this.onMessage) {
                        this.onMessage(line);
                    }
                }

                // Safety: if buffer gets too large, reset
                if (buffer.length > 65535) {
                    console.warn('SerialBridge: buffer overflow, resetting');
                    buffer = '';
                }
            }
        } catch (err) {
            if (err.name === 'NetworkError' || err.name === 'AbortError') {
                // Port was closed
            } else if (this.onError) {
                this.onError(err);
            }
        }

        this.isOpen = false;
        if (this.onClose) this.onClose();
    }

    /**
     * Close the port
     */
    async close() {
        if (this.reader) {
            try { this.reader.cancel(); } catch (e) {}
            try { this.reader.releaseLock(); } catch (e) {}
            this.reader = null;
        }

        if (this.writer) {
            try { this.writer.releaseLock(); } catch (e) {}
            this.writer = null;
        }

        if (this.port) {
            try { await this.port.close(); } catch (e) {}
            this.port = null;
        }

        this.isOpen = false;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SerialBridge;
}