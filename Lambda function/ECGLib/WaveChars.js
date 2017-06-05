'use strict';
module.exports = class WaveChars {
    constructor() {
        this.type = 46;
        this.RR1Pos = -1;
        this.RR1Value = -1;
        this.RR2Pos = -1;
        this.RR2Value = -1;
        this.RRInterval = -1;
        this.QRSBandWidth = -1;
        this.transformValue = -1;
        this.transformedQRSBand = -1;
        this.bpm = 0;
    }

    reset() {
        this.RR1Pos = -1;
        this.RR1Value = -1;
        this.RR2Pos = -1;
        this.RR2Value = -1;
        this.RRInterval = -1;
        this.QRSBandWidth = -1;
        this.bpm = 0;
    }

    set(inWaveChars) {
        this.type = inWaveChars.type;
        this.bpm = inWaveChars.bpm;
        this.RRInterval = inWaveChars.RRInterval;
        this.QRSBandWidth = inWaveChars.QRSBandWidth;
        this.RR1Pos = inWaveChars.RR1Pos;
        this.RR1Value = inWaveChars.RR1Value;
        this.RR2Pos = inWaveChars.RR2Pos;
        this.RR2Value = inWaveChars.RR2Value;
        this.transformValue = inWaveChars.transformValue;
        this.transformedQRSBand = inWaveChars.transformedQRSBand;
    }

}