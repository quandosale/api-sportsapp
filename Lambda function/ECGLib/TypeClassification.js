'use strict';

var RotationQueue = require('./RotationQueue.js');
var WaveChars = require('./WaveChars.js');

module.exports = class {

    constructor(_waveChars) {
        this.processwaveChars = new WaveChars();

        this.strideBPM = 3;

        this.waveChars = _waveChars;
        // this.waveChars = JSON.parse(JSON.stringify(_waveChars));

        this.bpmQueue = new RotationQueue();
        this.bpmQueue.init(8);
        this.bpmQueue.fullwith(1000);

        this.apmQueue = new RotationQueue();
        this.apmQueue.init(8);
        this.apmQueue.fullwith(4000);

        this.RRIntervalQueue = new RotationQueue();
        this.RRIntervalQueue.init(8);
        this.RRIntervalQueue.fullwith(1000);

        this.qrsQueue = new RotationQueue();
        this.qrsQueue.init(8);
        this.qrsQueue.fullwith(80);

        this.avgAmp = 4000;
        this.avgQRSBand = 80;
        this.avgRRInterval = 1000;
        this.QRSCounter = 0;
        this.waveCharsesArray = [];
        var _tmpWaveChars1 = new WaveChars();
        var _tmpWaveChars2 = new WaveChars();

        this.waveCharsesArray.push(_tmpWaveChars1);
        this.waveCharsesArray.push(_tmpWaveChars2);
        // _tmpWaveChars1.bpm = 500;
        // this.waveCharsesArray[0].bpm = 300;
        // console.log("==================================0=============", _tmpWaveChars1)
        // console.log("==================================1=============", this.waveCharsesArray);

    }

    restart() {
        this.avgAmp = 4000;
        this.avgQRSBand = 80;
        this.avgRRInterval = 1000;
        this.QRSCounter = 0;
    }

    classification() {
        this.QRSCounter++;
        this.processwaveChars.set(this.waveCharsesArray[0]);
        if (this.QRSCounter > 2) {
            this.Diff();
            if (this.QRSCounter > 7) this.DecidePrematureBeat();
            this.refresh();
        }
    }

    refresh() {
        this.bpmQueue.push(this.processwaveChars.RRInterval);

        var interval = this.processwaveChars.RRInterval;
        var prevInterval = this.bpmQueue.getFromEnd(-this.strideBPM);
        if (this.processwaveChars.RRInterval != 0) {
            var bpm = this.processwaveChars.bpm;
            bpm = bpm + (60000.0 / interval - 60000.0 / prevInterval) / this.strideBPM;
            this.processwaveChars.bpm = Math.floor(bpm);
        }


        if (this.QRSCounter <= 8) {
            if ((this.processwaveChars.RR2Value - 10001) <= 39998) {
                this.apmQueue.push(this.processwaveChars.RR2Value);
                this.avgAmp += (this.processwaveChars.RR2Value - this.apmQueue.getFromEnd(-5)) / 5.0;
            }
            if ((this.processwaveChars.QRSBandWidth - 31) <= 68) {
                this.qrsQueue.push(this.processwaveChars.QRSBandWidth);
                this.avgQRSBand += (this.processwaveChars.QRSBandWidth - this.qrsQueue.getFromEnd(-5)) / 5.0;
            }
            if ((this.processwaveChars.RRInterval - 151) <= 1648) {
                this.RRIntervalQueue.push(this.processwaveChars.RRInterval);
                this.avgRRInterval += (this.processwaveChars.RRInterval - this.RRIntervalQueue.getFromEnd(-5)) / 5.0;
            }
        } else {
            if (this.processwaveChars.type != 86) {
                this.apmQueue.push(this.processwaveChars.RR2Value);
                this.avgAmp += (this.processwaveChars.RR2Value - this.apmQueue.getFromEnd(-5)) / 5.0;
                this.qrsQueue.push(this.processwaveChars.QRSBandWidth);
                this.avgQRSBand += (this.processwaveChars.QRSBandWidth - this.qrsQueue.getFromEnd(-5)) / 5.0;
            }
            if (this.processwaveChars.type != 83) {
                this.RRIntervalQueue.push(this.processwaveChars.RRInterval);
                this.avgRRInterval += (this.processwaveChars.RRInterval - this.RRIntervalQueue.getFromEnd(-5)) / 5.0;
            }
        }

        this.waveCharsesArray[1].set(this.waveCharsesArray[0]);
        this.waveCharsesArray[0].set(this.waveChars);
    }

    DecidePrematureBeat() {
        if (this.processwaveChars.transformValue > 199 && this.processwaveChars.transformedQRSBand > 4) {
            this.processwaveChars.type = 86;

        } else {
            if (0.8 * this.avgRRInterval <= this.processwaveChars.RRInterval && (this.waveChars.RRInterval <= 1.3 * this.processwaveChars.RRInterval || this.avgRRInterval < this.processwaveChars.RRInterval)) {
                if (this.processwaveChars.RRInterval < this.avgRRInterval * 1.5) {
                    this.processwaveChars.type = 78;
                } else {
                    this.processwaveChars.type = 83;
                }
            } else {
                if (this.waveCharsesArray[1].type != 86) {
                    this.processwaveChars.type = 65;
                }
            }
        }
    }

    Diff() {
        var diff = this.processwaveChars.RR1Value - this.avgAmp;
        if (diff < 0)
            diff = -this.processwaveChars.RR1Value - this.avgAmp;
        diff = Math.floor(diff * 100 / this.avgAmp);

        this.processwaveChars.transformValue = Math.floor(diff);

        diff = this.processwaveChars.QRSBandWidth - this.avgQRSBand;
        if (diff < 0)
            diff = -this.processwaveChars.QRSBandWidth - this.avgQRSBand;
        diff = Math.floor(diff * 100 / this.avgQRSBand);
        this.processwaveChars.transformedQRSBand = Math.floor(diff);

    }

}