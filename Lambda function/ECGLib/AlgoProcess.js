'use strict';
var PipeLine = require('./PipeLine.js');
module.exports = class AlgoProcess {
    constructor() {
        this.pipleline = new PipeLine();
        this.pipleline.init(250, 5);
        this.bAF = false;
        this.prevbAF = false;
        this.AFstart = 0;
        this.AFend = 0;
        this.peakPos = 0;
        this.hrCount = 600;
        this.afCount = 0;
        this.is_HearRate_Append = false;
        this.is_Af_Append = false;
        this.isNotifyed = false;

        this.hrData = [];
        this.afResult = [];
    }

    AlgoProcess(val, _position, isEnd, _pos, callback) {
        // console.log('-- AlgoProcess function', val, _position);
        // this.is_Af_Append = bAppend;
        // this.is_HearRate_Append = bAppend;

        this.pipleline.add(val);
        this.bAF = false;

        if (this.pipleline.isDected()) {
            var heart = this.pipleline.getHeartRate();
            this.hrData.push(heart);
            this.hrData.push(this.hrCount);
            this.hrCount = 0;

            var pType = this.pipleline.typeClassification.processwaveChars.type;
            if (pType == 86 || pType == 83 || pType == 65)
                this.bAF = true;
            if (this.bAF) {
                if (!this.prevbAF) {
                    this.AFstart = this.peakPos;
                }

            } else {
                if (this.prevbAF) {
                    this.AFend = this.peakPos;
                    this.afResult.push({
                        s: this.AFstart,
                        e: this.AFend
                    });
                    if (!this.is_Af_Append) this.is_Af_Append = true;
                }
            }
            this.peakPos = _position;
            this.prevbAF = this.bAF;
        }
        if (isEnd) {

            if (typeof callback == "function") {
                callback(null, {
                    "AF": this.afResult,
                    "Hr": this.hrData,
                    "position": _pos,
                });
            } else {
                callback.send({
                    AF: this.afResult,
                    Hr: this.hrData,
                    position: _pos,
                });
            }
            this.hrCount++;
        }
    }
}