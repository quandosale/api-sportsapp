'use strict';
var TypeClassification = require('./TypeClassification.js');
var Proprocess = require('./Proprocess.js');
var WaveDetect = require('./WaveDetect.js');
var WaveChars = require('./WaveChars.js');
var RotationQueue = require('./RotationQueue.js');

module.exports = class PipeLine {

    constructor() {
        this._limit = 0;

        // this.typeClassification = new TypeClassification();
        this.typeClassification = null;

        // this.process = new Proprocess();
        this.proprocess = null;

        // this.waveDetect = new WaveDetect();
        this.waveDetect = null;

        // this.waveChars = new WaveChars();
        this.waveChars = null;

        // this.hrQueue = new RotationQueue();
        this.hrQueue = null;

        this.isRWaveDetect = false;
        this.bOdd = false;
        this.bReset = false;
        this.samplesPerSec = 0;

        this.hrSum = 0;
        this.hrCounter = 0;
        this.hrQueueSize = 5;
        this.bpm = 0;
        this.hrShowPeriod = 0;
        this.hrShowCounter = 0;
        this.heartRate = 0;
    }

    init(_samplesPerSec, _period) {
        this.hrShowCounter = _period - 1;
        this.hrShowPeriod = _period;
        this.bpm = 0;
        this.hrQueue = new RotationQueue();
        this.hrQueue.init(this.hrQueueSize);

        this.samplesPerSec = _samplesPerSec;
        this.proprocess = new Proprocess(_samplesPerSec);
        this.waveChars = new WaveChars();
        this.waveDetect = new WaveDetect(_samplesPerSec, this.waveChars);
        this.typeClassification = new TypeClassification(this.waveChars);
    }

    add(val) {
        this.bOdd = !this.bOdd;
        if (!this.bOdd) {
            this.isRWaveDetect = false;
            return;
        }
        this.proprocess.process(val);

        if (this.proprocess.isProcessable) {
            this.waveDetect.process(this.proprocess.processedValue);
            // console.log('this.proprocess.processedValue', this.proprocess.processedValue)
            if (this.waveDetect.doRestart()) {
                this.bReset = true;
                this.waveDetect.restart();
                this.proprocess.restart();
            }

            this.isRWaveDetect = this.waveDetect.isRWaveDetected;


            if (this.isRWaveDetect) {

                this.CalcHeartRate();
                this.bpm = Math.floor(60 * this.samplesPerSec / this.bpm);
                if (this.hrShowCounter == this.hrShowPeriod) {
                    this.heartRate = this.bpm;
                    this.hrShowCounter = 0;
                } else {
                    this.hrShowCounter++;
                }
                this.typeClassification.classification();
            }
        }
    }

    CalcHeartRate() {
        var hr = this.waveDetect.waveChars.RRInterval * this.samplesPerSec / 1000;
        var temp = hr == -1 || hr > 2 * this.samplesPerSec || hr < 60 * this.samplesPerSec / 200.0;

        if (hr == -1 || hr > 2 * this.samplesPerSec || hr < 60 * this.samplesPerSec / 200.0) return;
        this.hrQueue.push(hr);
        if (this.hrCounter < this.hrQueueSize) {
            // console.log(hr);
            this.hrSum += hr;
            this.hrCounter++;
            this.bpm = this.hrSum / this.hrCounter;
            return;
        }
        var prevhr = this.hrQueue.getFromEnd(-this.hrQueueSize);
        hr -= prevhr;
        this.hrSum += hr;
        this.bpm = this.hrSum / this.hrQueueSize;
    }

    getHeartRate() {
        return this.heartRate;
    }

    restart() {
        this.heartRate = 0;
        this.hrShowCounter = this.hrShowPeriod - 1;
        this.bpm = 0;
        this.hrSum = 0;
        this.hrCounter = 0;
        this.proprocess.restart();
        this.waveDetect.restart();
        this.isRWaveDetect = false;
    }

    isDected() {
        return this.isRWaveDetect;
    }

}