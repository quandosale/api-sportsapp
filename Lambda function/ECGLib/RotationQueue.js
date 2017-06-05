'use strict';

module.exports = class RotationQueue {

    constructor() {
        this.originSize = 0;
        this.size = 0;
        this.counter = 0;
        this.values = null;
        this.index = 0;
        this.indexSize = 100000000;
        this.isIndexFull = false;
        this.isFull = false;

    }

    init(len) {
        this.originSize = len;
        for (this.size = 1; this.size < len; this.size *= 2);

        this.values = [];
        for (var i = 0; i < this.size; i++) {
            this.values.push(0);
        }
        this.counter = -1;
        this.index = 0;
        this.isIndexFull = false;
        this.indexSize = 100000000;
        this.isFull = false;
    }

    fullwith(val) {
        for (var i = 0; i < this.size; i++)
            this.push(val);
    }

    reset() {
        this.counter = -1;
        this.isFull = false;
    }

    totalSum() {
        var sum = 0;
        for (var i = 0; i < this.size; i++)
            sum += this.values[i];
        return sum;
    }

    push(val) {
        if (this.values == null) return;
        this.counter++;
        if (this.counter >= this.originSize) this.isFull = true;
        this.counter %= this.size;
        this.values[this.counter] = val;
        this.index++;
        if (this.index > this.indexSize) {
            this.index = 0;
            this.isIndexFull = true;
        }
    }

    setAtlast(value) {
        if (this.counter < 0 || this.counter >= this.size) return;
        this.values[this.counter] = value;
    }

    get(index) {
        if (this.values == null) return -1;
        return this.values[index];
    }

    getFromEnd(index) {
        var ofs = this.counter + index;
        if (ofs < 0) {
            ofs++;
            ofs %= this.size;
            ofs += this.size - 1;
        } else ofs %= this.size;
        return this.values[ofs];
    }

}