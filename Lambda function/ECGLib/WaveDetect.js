'use strict';
var WaveChars = require('./WaveChars.js');
var RotationQueue = require('./RotationQueue.js');
module.exports = class WaveDetect {

    constructor(_samplesPerSec, _waveChars) {
        // this.waveChars = new WaveChars();
        this.samplesPerSec = 0; // int
        this.amplitudeQueueSize = 0; // int
        this.amplitudeQueue = new RotationQueue();
        this.amplitudeQueueMiddle = 0; // int

        this.pwavePos1 = 0; // int
        this.pwavePos2 = 0; // int

        this.amplitudeThres1 = 0; // int
        this.amplitudeThres2 = 0; // int

        this.isRWaveDetected = false;
        this.frontLen = 0; // int

        this.posCounter1forRRI = 0; // int
        this.posCounter2forRRI = 0; // int

        this.prePosCounter1forRRI = 0; // int
        this.prePosCounter2forRRI = 0; // int

        this.doDectectionStart = false;

        this.RR1Pos = 0; // int
        this.prevRR1Pos = 0; // int
        this.RR1Value = 0; // int
        this.prevRR1Value = 0; // int

        this.RR2Pos = 0; // int
        this.prevRR2Pos = 0; // int
        this.RR2Value = 0; // int
        this.prevRR2Value = 0; // int
        this.DectectInterval = 0; // int

        // this.waveChars = JSON.parse(JSON.stringify(_waveChars));
        this.waveChars = _waveChars;


        this.samplesPerSec = _samplesPerSec;

        this.amplitudeQueueSize = Math.floor(2 * Math.floor(this.samplesPerSec * 0.12 * 0.5)) + 1;

        this.amplitudeQueueMiddle = Math.floor(this.amplitudeQueueSize / 2); // khs
        // this.amplitudeQueueMiddle = this.amplitudeQueueSize / 2; // khs

        this.amplitudeQueue = new RotationQueue();
        this.amplitudeQueue.init(this.amplitudeQueueSize);

        this.pwavePos1 = ((this.amplitudeQueueSize * 10923) >> 16) - (this.amplitudeQueueSize >> 15);
        this.pwavePos2 = this.pwavePos1;

        this.doDectectionStart = true;
        this.amplitudeThres1 = 500;
        this.amplitudeThres2 = 1000;
        this.isRWaveDetected = false;
        this.frontLen = Math.floor(_samplesPerSec * 0.25);

        this.posCounter1forRRI = 0;
        this.posCounter2forRRI = 0;
        this.RR1Value = -1;
        this.prevRR1Value = -1;
        this.RR2Value = -1;
        this.prevRR2Value = -1;

        this.RR1Pos = -1;
        this.RR2Pos = -1;
        this.prevRR1Pos = -1;
        this.prevRR2Pos = -1;

        this.DectectInterval = 0;
    }

    doRestart() {
        if (!this.isRWaveDetected && this.DectectInterval > this.samplesPerSec * 10) return true;
        return false;
    }

    DecideQRS() {
        this.posCounter1forRRI++;
        this.posCounter2forRRI++;

        if (!this.amplitudeQueue.isFull) return;
        var middleVal = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle);
        var diffbeforFirst, diffafterFirst, diffbeforSecond, diffafterSecond;
        var tan = 0.0;
        if (this.doDectectionStart) {
            tan = (this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + this.pwavePos1) - middleVal) / this.pwavePos1;

            diffbeforFirst = middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 2 * this.pwavePos1);
            diffafterFirst = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 2 * this.pwavePos1) - middleVal;

            diffbeforSecond = middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 3 * this.pwavePos1);
            diffafterSecond = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 3 * this.pwavePos1) - middleVal;
            // *******************
            var r = this.posCounter1forRRI > this.frontLen &&
                middleVal < this.amplitudeThres1 &&
                (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 1)) <= 40 &&
                (this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 2) - middleVal) > 2 &&
                this.amplitudeThres1 * 0.1 >= (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - this.pwavePos1)) &&
                tan > 4 && 0.15 * this.amplitudeThres1 >= diffbeforFirst &&
                diffafterFirst >= 0.2 * this.amplitudeThres1 &&
                0.25 * this.amplitudeThres1 >= diffbeforSecond &&
                diffafterSecond >= 0.34 * this.amplitudeThres1;
            // *******************

            if (this.posCounter1forRRI > this.frontLen && middleVal < this.amplitudeThres1 &&
                (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 1)) <= 40 &&
                (this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 2) - middleVal) > 2 &&
                this.amplitudeThres1 * 0.1 >= (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - this.pwavePos1)) &&
                tan > 4 && 0.15 * this.amplitudeThres1 >= diffbeforFirst &&
                diffafterFirst >= 0.2 * this.amplitudeThres1 &&
                0.25 * this.amplitudeThres1 >= diffbeforSecond && diffafterSecond >= 0.34 * this.amplitudeThres1) //When p wave come or Q
            {

                this.prePosCounter1forRRI = this.posCounter1forRRI;
                this.posCounter1forRRI = 0;
                this.doDectectionStart = false;
                this.prevRR1Pos = this.RR1Pos;
                this.RR1Pos = this.amplitudeQueue.index - this.amplitudeQueueMiddle;
                this.prevRR1Value = this.RR1Value;
                this.RR1Value = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle);
                return;
            }
        }
        tan = (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - this.pwavePos2)) / this.pwavePos2;
        diffafterFirst = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + this.pwavePos2) - middleVal;
        diffafterSecond = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 2 * this.pwavePos2) - middleVal;
        diffbeforSecond = middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 2 * this.pwavePos2);


        var diffbeforThird, diffafterThird;
        diffbeforThird = middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 3 * this.pwavePos2);
        diffafterThird = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 3 * this.pwavePos2) - middleVal;

        if (this.posCounter2forRRI > this.frontLen && middleVal >= this.amplitudeThres1 && (this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle + 1) - middleVal) <= 30 //When T wave come or S
            &&
            (middleVal - this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle - 2)) > 4 && diffafterFirst <= this.amplitudeThres1 * 0.15 && tan > 3 &&
            0.2 * this.amplitudeThres1 >= diffafterSecond && 0.3 * this.amplitudeThres1 <= diffbeforSecond && diffafterThird <= 0.3 * this.amplitudeThres1 && diffbeforThird >= 0.4 * this.amplitudeThres1) {

            this.prePosCounter2forRRI = this.posCounter2forRRI;
            this.posCounter2forRRI = 0;

            this.prevRR2Pos = this.RR2Pos;
            this.RR2Pos = this.amplitudeQueue.index - this.amplitudeQueueMiddle;
            this.prevRR2Value = this.RR2Value;
            this.RR2Value = this.amplitudeQueue.getFromEnd(-this.amplitudeQueueMiddle);

            if (this.doDectectionStart) {
                if ((this.RR2Pos - this.prevRR2Pos) >= 0.5 * this.samplesPerSec) {
                    // console.log("test", this.RR2Value, this.doDectectionStart);
                    this.isRWaveDetected = true;
                    this.posCounter1forRRI = 0;
                    this.amplitudeThres2 = Math.floor(this.amplitudeThres2 + (middleVal - this.amplitudeThres2) * 0.36);

                    this.amplitudeThres1 = Math.floor(this.amplitudeThres2 * 0.3);
                    this.prevRR1Value = this.RR1Value;
                    this.RR1Value = -1;
                    this.prevRR1Pos = this.RR1Pos;
                    this.RR1Pos = Math.floor(this.RR2Pos - this.samplesPerSec * 0.09);
                    this.DectectInterval = 0;
                    this.waveChars.RR1Pos = this.RR1Pos;
                    this.waveChars.RR1Value = -1;
                    this.waveChars.RR2Pos = this.RR2Pos;
                    this.waveChars.RR2Value = this.RR2Value;
                } else {
                    this.DectectInterval++;
                    this.isRWaveDetected = false;
                    this.RR2Pos = this.prevRR2Pos;
                    this.RR2Value = this.prevRR2Value;
                    this.posCounter2forRRI = this.prePosCounter2forRRI;
                }
                // console.log("test");
                return;
            }
            this.amplitudeThres2 = Math.floor(this.amplitudeThres2 + (middleVal - this.amplitudeThres2) * 0.36);
            this.amplitudeThres1 = Math.floor(this.amplitudeThres2 * 0.3);
            // console.log("test");
            if ((this.RR2Pos - this.prevRR2Pos) >= 0.5 * this.samplesPerSec || this.amplitudeThres2 * 0.48 <= middleVal) {
                this.isRWaveDetected = true;
                this.doDectectionStart = true;
                this.DectectInterval = 0;
                this.waveChars.RR1Pos = this.RR1Pos;
                this.waveChars.RR1Value = this.RR1Value;
                this.waveChars.RR2Pos = this.RR2Pos;
                this.waveChars.RR2Value = this.RR2Value;
                return;
            }
            this.RR2Value = this.prevRR2Value;
            this.RR2Pos = this.prevRR2Pos;
            this.posCounter2forRRI = this.prePosCounter2forRRI;
            this.RR1Pos = this.prevRR1Pos;
        } else {
            if (this.doDectectionStart || this.posCounter1forRRI < 0.25 * this.samplesPerSec) {
                this.DectectInterval++;
                this.isRWaveDetected = false;
                return;
            }
            if ((this.RR1Pos - this.prevRR1Pos) >= 0.5 * this.samplesPerSec) {
                if ((this.RR1Pos - this.RR2Pos) >= 0.5 * this.samplesPerSec) {
                    this.prevRR2Value = this.RR2Value;
                    this.prevRR2Pos = this.RR2Pos;
                    this.isRWaveDetected = true;
                    this.DectectInterval = 0;
                    this.posCounter2forRRI = 0;
                    this.doDectectionStart = true;
                    this.RR2Value = -1;
                    this.RR2Pos = Math.floor(this.samplesPerSec * 0.09 + this.RR1Pos);
                    this.waveChars.RR1Pos = this.RR1Pos;
                    this.waveChars.RR1Value = this.RR1Value;
                    this.waveChars.RR2Pos = this.RR2Pos;
                    this.waveChars.RR2Value = -1;
                    return;
                }
                this.RR1Pos = this.prevRR1Pos;
            }
        }
        this.DectectInterval++;
        this.RR1Value = this.prevRR1Value;
        this.doDectectionStart = true;
        this.isRWaveDetected = false;
        this.posCounter1forRRI = this.prePosCounter1forRRI;

    }

    process(val) {
        this.amplitudeQueue.push(val);
        this.DecideQRS();
        if (this.isRWaveDetected) this.CalDurandInt();
    }

    restart() {
        this.doDectectionStart = true;
        this.amplitudeThres1 = 500;
        this.amplitudeThres2 = 1000;
        this.isRWaveDetected = false;
        this.posCounter1forRRI = 0;
        this.posCounter2forRRI = 0;
        this.RR1Value = 0;
        this.prevRR1Value = 0;
        this.RR2Value = 0;
        this.prevRR2Value = 0;
        this.DectectInterval = 0;
        this.amplitudeQueue.reset();
        this.waveChars.reset();
    }

    CalDurandInt() {
        if (this.RR1Pos == -1 && this.prevRR1Pos == -1) return;
        var stride = this.RR1Pos - this.prevRR1Pos;
        if (stride <= 0) return;
        this.waveChars.bpm = 60 * this.samplesPerSec / stride;
        this.waveChars.RRInterval = 1000 * stride / this.samplesPerSec; // unit is millisecond
        stride = this.RR2Pos - this.RR1Pos;
        this.waveChars.QRSBandWidth = 1000 * stride / this.samplesPerSec;
    }

}