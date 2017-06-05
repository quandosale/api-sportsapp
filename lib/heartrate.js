var fs = require('graceful-fs');

var HEARTRATE_ZONE = {
    Hardcore: 0,
    Peak: 0,
    Cardio: 0,
    Fat_Burn: 0,
    Rest: 0
}

function HRMETA_TO_BUF(meta) {
    var meta_buf = Buffer.allocUnsafe(10);

    meta_buf.writeInt16LE(meta.peak, 0);
    meta_buf.writeInt16LE(meta.fat_burn, 2);
    meta_buf.writeInt16LE(meta.cardio, 4);
    meta_buf.writeInt16LE(meta.rest, 6);
    meta_buf.writeInt16LE(meta.duration, 8);
    // console.log(meta_buf, meta.duration);
    return meta_buf;
}

function HR_TO_BUF(arr, patient, duration) {
    var heartRate = new Array();
    for (var i = 0; i < arr.length / 2; i++) {
        for (var j = 0; j < arr[i * 2 + 1]; j++) {
            heartRate.push(arr[i * 2]);
        }
    }

    var age = (new Date().getFullYear()) - (new Date(patient.birthday).getFullYear());
    const data_buf = Buffer.allocUnsafe(duration * 2);
    const meta_buf = Buffer.allocUnsafe(10);
    const MAX_HR = 220 - age;
    HEARTRATE_ZONE.Peak = 1 * MAX_HR;
    HEARTRATE_ZONE.Hardcore = Math.round(0.9 * MAX_HR);
    HEARTRATE_ZONE.Cardio = Math.round(0.8 * MAX_HR);
    HEARTRATE_ZONE.Fat_Burn = Math.round(0.7 * MAX_HR);
    HEARTRATE_ZONE.Rest = Math.round(0.6 * MAX_HR);

    var peak = 0;
    var fat_burn = 0;
    var cardio = 0;
    var rest = 0;
    var sampleFreq = heartRate.length / duration;
    for (var i = 0; i < duration; i++) {
        var idx = Math.round(sampleFreq * i);
        var sample = 0;
        for (var ii = idx; ii < idx + Math.round(sampleFreq); ii++)
            sample += heartRate[ii];
        sample /= Math.round(sampleFreq);

        if (sample < HEARTRATE_ZONE.Peak && sample > HEARTRATE_ZONE.Cardio) peak++;
        if (sample < HEARTRATE_ZONE.Cardio && sample > HEARTRATE_ZONE.Fat_Burn) fat_burn++;
        if (sample < HEARTRATE_ZONE.Fat_Burn && sample > HEARTRATE_ZONE.Rest) cardio++;
        if (sample < HEARTRATE_ZONE.Rest) rest++;
        data_buf.writeInt16LE(sample, i * 2);
    }
    var meta_info = {
        peak: peak,
        fat_burn: fat_burn,
        cardio: cardio,
        rest: rest,
        duration: duration
    }

    // console.log("HeartRate Zone", HEARTRATE_ZONE);
    // console.log('HR sampleFreq', sampleFreq, heartRate.length, duration);
    // console.log("meta_info", meta_info);
    return {
        data_buf: data_buf,
        meta_info: meta_info
    };
}


function readHROverview(filename) {
    var filesize = fs.statSync(filename)['size'];
    var fd = fs.openSync(filename, 'r');
    var buf = Buffer.allocUnsafe(2);
    fs.readSync(fd, buf, 0, 2, filesize - 2);
    duration = buf.readUInt16LE(0);
    fs.readSync(fd, buf, 0, 2, filesize - 4);
    rest = buf.readUInt16LE(0);
    fs.readSync(fd, buf, 0, 2, filesize - 6);
    cardio = buf.readUInt16LE(0);
    fs.readSync(fd, buf, 0, 2, filesize - 8);
    fat_burn = buf.readUInt16LE(0);
    fs.readSync(fd, buf, 0, 2, filesize - 10);
    peak = buf.readUInt16LE(0);
    fs.closeSync(fd);

    return {
        duration: duration,
        rest: rest,
        cardio: cardio,
        fat_burn: fat_burn,
        peak: peak
    }
}

function readMeta(filename) {
    if (fs.existsSync(filename)) {
        var fd = fs.openSync(filename, 'r');
        var meta_buf = Buffer.allocUnsafe(10);
        fs.readSync(fd, meta_buf, 0, 10, 0);
        fs.closeSync(fd);
        var meta = {
            peak: Number,
            fat_burn: Number,
            cardio: Number,
            rest: Number,
            duration: Number
        };
        meta.peak = meta_buf.readInt16LE(0);
        meta.fat_burn = meta_buf.readInt16LE(2);
        meta.cardio = meta_buf.readInt16LE(4);
        meta.rest = meta_buf.readInt16LE(6);
        meta.duration = meta_buf.readInt16LE(8);
        return meta;
    }
    return null;
}

function readHR(res, filename) {

    var buf = Buffer.allocUnsafe(2);

    filename = filename + '_hr.dat';
    var metafile = filename.slice(0, -4) + '_meta.dat';
    var hr_arr;
    // console.log('readHR', metafile);
    if (fs.existsSync(filename) && fs.existsSync(metafile)) {

        var meta = readMeta(metafile);
        // console.log('readHR', meta, metafile);

        buf = Buffer.allocUnsafe(meta.duration * 2);
        var fd = fs.openSync(filename, 'r');
        fs.readSync(fd, buf, 0, meta.duration * 2, 0);
        fs.closeSync(fd);
        hr_arr = new Array(meta.duration);
        for (var i = 0; i < hr_arr.length; i++)
            hr_arr[i] = buf.readInt16LE(i * 2);
        console.log('readHR', filename, hr_arr.length);
        var arr;
        if (hr_arr.length > 3600) {
            arr = new Array(Math.floor(hr_arr.length / 10));
            for (var i = 0; i < arr.length; i++) {
                arr[i] = 0;
                for (var j = 0; j < 10; j++)
                    arr[i] += hr_arr[i * 10 + j];
                arr[i] /= 10;
            }
        } else arr = hr_arr;

        var result = Array.from(new Set(arr)).map(
            x => [x, arr.filter(y => y === x).length]
        );
        res.send({
            success: true,
            message: 'Successfully returned HR data',
            data: {
                data: result,
                meta: meta
            }
        });
    } else {
        res.send({
            success: false,
            message: 'heartrate resource not found',
            data: null
        });
    }

}

function saveHR(filename, heartRate, patient, duration, bAppend) {
    // console.log('saveHr', heartRate.length, duration, bAppend);
    var buf = HR_TO_BUF(heartRate, patient, duration);
    var metafile = filename.slice(0, -4) + '_meta.dat';
    if (bAppend) {
        fs.appendFileSync(filename, buf.data_buf);
        var meta = readMeta(metafile);
        if (meta == null) {
            meta = {
                duration: 0,
                rest: 0,
                cardio: 0,
                fat_burn: 0,
                peak: 0
            };
        }

        if (buf.meta_info != null || meta != null) {

            meta.cardio += buf.meta_info.cardio;
            meta.fat_burn += buf.meta_info.fat_burn;
            meta.rest += buf.meta_info.rest;
            meta.peak += buf.meta_info.peak;
            meta.duration += buf.meta_info.duration;

        } else {
            console.log(meta, "buf.meta_info == null");
        }
        fs.writeFileSync(metafile, HRMETA_TO_BUF(meta));
        // console.log(meta, "Meta save");


    } else {
        fs.writeFileSync(filename, buf.data_buf);
        fs.writeFileSync(metafile, HRMETA_TO_BUF(buf.meta_info));
    }
}

module.exports = {
    readHR: readHR,
    saveHR: saveHR
}