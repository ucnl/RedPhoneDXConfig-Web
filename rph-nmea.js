// rph-nmea.js — Minimal NMEA builder/parser for RedPhone-DX protocol
// Replaces UCNLNMEA for this specific device

const NMEA = {
    START: '$',
    END: '\r\n',
    SEP: ',',
    CHK: '*',

    // Manufacturer codes used
    MC_RPH: 'RPH',
    MC_AZM: 'AZM',

    // Sentence IDs
    SID: {
        ACK:     '0',  // $PRPH0,cmdID,result
        SETS:    '1',  // $PRPH1,ssbChID,isRWLT,RWLT_DiverID,RWLT_ChID
        SETS2:   '2',  // $PRPH2,flashWrite,ssbChID,hpOutVol,vadSens,lowBat,isRWLT,rwltDiverID,flags1,res2,res3
        STMD:    '3',  // $PRPH3,ssbChID,mode,res1,res2
        DINFO_GET: '?', // $PRPH?,res1
        DINFO:   '!',  // $PRPH!,dtype,sn,sys_info,sys_ver,res1,res2,res3
    },

    /**
     * Calculate NMEA XOR checksum
     * @param {string} str - string between $ and * (excluding both)
     * @returns {number} checksum byte
     */
    checksum(str) {
        let cs = 0;
        for (let i = 0; i < str.length; i++) {
            cs ^= str.charCodeAt(i);
        }
        return cs & 0xFF;
    },

    /**
     * Build a proprietary NMEA sentence
     * @param {string} manufacturer - 3-char manufacturer code (e.g. 'RPH')
     * @param {string} sentenceId - sentence ID string (e.g. '?', '!', '0')
     * @param {Array} params - array of values (null = empty field)
     * @returns {string} complete NMEA sentence with $, *, checksum, \r\n
     */
    buildProprietary(manufacturer, sentenceId, params) {
        // Build field list
        const fields = params.map(p => (p !== null && p !== undefined) ? String(p) : '');

        // Core string for checksum: $P{MC}{ID},{fields}
        let core = 'P' + manufacturer + sentenceId;
        if (fields.length > 0) {
            core += NMEA.SEP + fields.join(NMEA.SEP);
        }

        const cs = NMEA.checksum(core);
        return NMEA.START + core + NMEA.CHK + cs.toString(16).toUpperCase().padStart(2, '0') + NMEA.END;
    },

    /**
     * Build RPH sentence (shorthand)
     * @param {string} sentenceId
     * @param {Array} params
     * @returns {string}
     */
    buildRPH(sentenceId, params) {
        return NMEA.buildProprietary(NMEA.MC_RPH, sentenceId, params || []);
    },

    /**
     * Parse a raw NMEA line into structured object
     * @param {string} raw - raw line including $, *, \r\n
     * @returns {object|null} { manufacturer, sentenceId, params[], valid }
     */
    parse(raw) {
        if (!raw || raw.length === 0) return null;

        // Strip \r\n
        const line = raw.replace(/[\r\n]+$/, '');

        // Must start with $
        if (!line.startsWith(NMEA.START)) return null;

        // Split checksum
        const chkIdx = line.indexOf(NMEA.CHK);
        let core, declaredCs;
        if (chkIdx >= 0) {
            core = line.substring(1, chkIdx); // after $, before *
            declaredCs = line.substring(chkIdx + 1);
        } else {
            core = line.substring(1);
            declaredCs = null;
        }

        // Verify checksum if present
        if (declaredCs) {
            const realCs = NMEA.checksum(core);
            const declaredVal = parseInt(declaredCs, 16);
            if (realCs !== declaredVal) {
                return { manufacturer: null, sentenceId: null, params: [], valid: false, error: 'checksum' };
            }
        }

        // Split into fields
        const fields = core.split(NMEA.SEP);
        if (fields.length === 0) return null;

        // Parse header: P{MC}{ID}
        const header = fields[0];
        if (!header.startsWith('P') || header.length < 5) return null;

        const manufacturer = header.substring(1, 4);
        const sentenceId = header.substring(4);

        // Extract params (everything after header)
        const params = fields.slice(1).map(f => (f === '') ? null : NMEA.parseToken(f));

        return {
            manufacturer,
            sentenceId,
            params,
            valid: true
        };
    },

    /**
     * Try to parse a token to number, fallback to string
     */
    parseToken(token) {
        if (token === null || token === undefined) return null;
        if (token === '') return null;

        // Try integer
        if (/^-?\d+$/.test(token)) {
            return parseInt(token, 10);
        }

        // Try float
        if (/^-?\d+\.\d+$/.test(token)) {
            return parseFloat(token);
        }

        // Return as string
        return token;
    },

    /**
     * Build RPH sentence with automatic ID and params
     */

    // Query device info: $PRPH?,0
    buildQueryDINFO() {
        return NMEA.buildRPH(NMEA.SID.DINFO_GET, [0]);
    },

    // Query SETS (basic settings): $PRPH1,ssbChID,isRWLT,RWLT_DiverID,RWLT_ChID
    buildQuerySETS(ssbChID, isRWLT, rwltDiverID, rwltChID) {
        return NMEA.buildRPH(NMEA.SID.SETS, [
            (ssbChID !== null && ssbChID !== 16) ? ssbChID : null,
            isRWLT ? 1 : 0,
            rwltDiverID || 0,
            rwltChID || 0
        ]);
    },

    // Query SETS2 read (all null): $PRPH2,,,,,,,,,,
    buildQuerySETS2Read() {
        return NMEA.buildRPH(NMEA.SID.SETS2, [null, null, null, null, null, null, null, null, null, null]);
    },

    // Query SETS2 write with specific params
    buildQuerySETS2Write(settings) {
        const s = settings || {};
        return NMEA.buildRPH(NMEA.SID.SETS2, [
            s.flashWrite !== undefined ? (s.flashWrite ? 1 : 0) : null,
            (s.ssbChannelId !== undefined && s.ssbChannelId !== 16) ? s.ssbChannelId : null,
            s.headphoneOutVolume !== undefined ? s.headphoneOutVolume : null,
            s.vadSensitivity !== undefined ? s.vadSensitivity : null,
            s.lowBatteryThresholdV !== undefined ? s.lowBatteryThresholdV : null,
            s.isRWLT !== undefined ? (s.isRWLT ? 1 : 0) : null,
            s.rwltDiverId !== undefined ? s.rwltDiverId : null,
            s.flags1 !== undefined ? s.flags1 : null,
            null, // res1
            null  // res2
        ]);
    },

    // Query STMD
    buildQuerySTMD(ssbChID, mode, res1, res2) {
        return NMEA.buildRPH(NMEA.SID.STMD, [
            (ssbChID !== null && ssbChID !== 16) ? ssbChID : null,
            (mode !== undefined && mode >= 0) ? mode : null,
            (res1 !== undefined && res1 >= 0) ? res1 : null,
            (res2 !== undefined && res2 >= 0) ? res2 : null
        ]);
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NMEA;
}