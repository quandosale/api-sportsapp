'use strict';
var RotationQueue = require('./RotationQueue.js');

module.exports = class Proprocess {
    constructor(_samplesPerSecond) {
        this._limit = 0;
        this._counter = 0;
        this.isOK = false;

        this.transformValue = 0;

        this.waitingSamples = _samplesPerSecond * 5; // to calculate avg and squareavg correctly wait for 5 seconds
        this.samplesPerSecond = _samplesPerSecond;
        this.inFactorCount = (((5243 * _samplesPerSecond) >> 16) >> 2) - (_samplesPerSecond >> 15);
        this.inFactorCount = this.inFactorCount * 2 + 1;
        this.inFactor = [];
        for (var i = 0; i < this.inFactorCount; i++) {
            this.inFactor.push(0.0);
        }
        this.outFactorCount = 3;
        this.outFactor = [];
        for (var i = 0; i < this.outFactorCount; i++) {
            this.outFactor.push(0.0);
        }
        this.outFactor[0] = 1;
        this.outFactor[1] = -2;
        this.outFactor[2] = 1;
        for (var i = 0; i < this.inFactorCount; i++)
            this.inFactor[i] = 0;
        this.inFactor[0] = 1;
        this.inFactor[this.inFactorCount - 1] = 1;
        this.inFactor[Math.floor(this.inFactorCount / 2)] = -2;

        this.inQueue = new RotationQueue();
        this.inQueue.init(this.inFactorCount);
        this.inQueue.fullwith(0);

        this.outQueue = new RotationQueue();
        this.outQueue.init(this.outFactorCount);
        this.outQueue.fullwith(0);

        this.isProcessable = false;

        this.sampleCounter = 0;
        this.avg = 0;
        this.squareAvg = 0;
        this.diffFactorCount = 5;
        this.diffFactor = [];
        for (var i = 0; i < this.diffFactorCount; i++) {
            this.diffFactor.push(0.0);
        }
        this.diffFactor[0] = -1;
        this.diffFactor[1] = -2;
        this.diffFactor[2] = 0;
        this.diffFactor[3] = 2;
        this.diffFactor[4] = 1;
        this.diffQueue = new RotationQueue();
        this.diffQueue.init(5);

        this.integralLen = Math.floor(this.samplesPerSecond * 0.18);
        this.integralQueue = new RotationQueue();
        this.integralQueue.init(this.integralLen);
        this.processedValue = -1;
    }

    restart() {
        this.inQueue.reset();
        this.outQueue.reset();
        this.diffQueue.reset();
        this.integralQueue.reset();
        this.isProcessable = false;
        this.avg = 0;
        this.squareAvg = 0;
        this.processedValue = -1;
        this.sampleCounter = 0;
    }

    normalize(_val) {
        var rst = 0;
        if (this.isProcessable) {
            rst = _val - this.avg;
            rst /= this.squareAvg;
            rst *= 500;
            rst = Math.floor(rst);
            return rst;
        }
        this.avg *= this.sampleCounter;
        this.squareAvg *= this.sampleCounter;
        this.avg += _val;
        this.squareAvg += _val * _val;
        this.sampleCounter++;
        this.avg /= this.sampleCounter;
        this.squareAvg /= this.sampleCounter;
        if (this.sampleCounter == this.waitingSamples) {
            this.squareAvg -= this.avg * this.avg;
            this.squareAvg = Math.sqrt(this.squareAvg);
            this.isProcessable = true;
            rst = _val - this.avg;
            rst /= this.squareAvg;
            rst *= 500;
            rst = Math.floor(rst);
        }
        return rst;
    }

    Filter(_val) {
        this.transformValue = 0;
        this.inQueue.push(0);
        if (!this.inQueue.isFull) return;
        this.inQueue.setAtlast(_val);
        for (var i = 0; i < this.inFactorCount; i++) {
            this.transformValue += this.inQueue.getFromEnd(-i) * this.inFactor[i];
        }
        if (this.outFactorCount > 1) {
            for (var i = 1; i < this.outFactorCount; i++) {
                this.transformValue -= this.outQueue.getFromEnd(-i + 1) * this.outFactor[i];
            }
        }
        this.outQueue.push(Math.floor(this.transformValue)); // math
        // var from = 2500;
        // var num = 10;
        // if (this._limit < from + num) {

        //     if (this._limit > from) {
        //         console.log(this._limit, '     value', _val, this.transformValue);
        //     }
        //     this._limit++;
        // }
    }

    Diff() {
        this.diffQueue.push(0);
        if (!this.diffQueue.isFull) {
            this.transformValue = 0;
            return;
        }
        this.diffQueue.setAtlast(Math.floor(this.transformValue)); //math
        this.transformValue = 0;
        for (var i = 0; i < this.diffFactorCount; i++) {
            this.transformValue += this.diffQueue.getFromEnd(-i) * this.diffFactor[this.diffFactorCount - 1 - i];
        }
        this.transformValue *= this.samplesPerSecond * 0.125 * 0.0001;
        this.transformValue = Math.floor(this.transformValue);
        // var from = 2500;
        // var num = 10;
        // if (this._limit < from + num) {

        //     if (this._limit > from) {
        //         console.log(this._limit, this.transformValue);
        //     }
        //     this._limit++;
        // }
    }

    Integral() {
        this.processedValue = 0;
        this.integralQueue.push(this.transformValue * this.transformValue);
        // if (this._limit < 15) console.log(this.transformValue);
        if (this.integralQueue.isFull) {
            // console.log('===============================', this.integralQueue);
            var sum = 0;
            for (var i = 0; i < this.integralLen; i++) {
                // var test = this.integralQueue.getFromEnd(-i);
                // if (this._limit == 46) {
                //     console.warn(test, ",");
                // }
                sum += this.integralQueue.getFromEnd(-i);
            }

            sum = Math.floor(sum);
            sum /= this.integralLen;
            sum = Math.floor(sum);
            this.processedValue = sum;
        }
        // var from = 40;
        // var num = 10;
        // if (this._limit < from + num) {

        //     if (this._limit > from) {

        //         // console.log('===============================', this._limit);
        //         // console.log(this.integralQueue);
        //         console.log(this.processedValue);
        //     }
        //     this._limit++;
        // }
    }

    process(_val) {
        var norm = this.normalize(_val);
        var from = 5040;
        var num = 10;
        if (this._limit < from + num) {
            if (this._limit > from) {
                // console.log('==============', this._limit, '==>', norm, _val, this.squareAvg);
            }
            this._limit++;
        }

        if (this.isProcessable) {
            this.Filter(norm);
            this.Diff();
            this.Integral();
        }
    }

}