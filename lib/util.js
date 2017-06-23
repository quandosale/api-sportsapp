var fs = require('graceful-fs');
var randomAccessFile = require('random-access-file')
var HR_Handler = require('./heartrate');
var AF_Handler = require('./ECGLib/arrhythmia');

var global = require('../global/config');
var Smooth = require('./smooth').Smooth;

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var accountSchema = require('../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);

var patientSchema = require('../model/identities').patientSchema;
var patientModel = mongoose.model('Patient', patientSchema);

// ecg buffer to text (for check)
// function fileTestWrite(buffer) {
//     var filename = "public/datasets/11111";
//     var ecg_signalfile = filename + "_ecg.txt";
//     fs.writeFileSync(ecg_signalfile, buffer);
// }

function ecgToBuffer(arr) {
    const buf = Buffer.allocUnsafe(arr.length * 2);
    for (i = 0; i < arr.length; i++) {
        buf.writeInt16LE(parseInt(arr[i]), i * 2);
    }
    return buf;
}

function validate16Int(val) {
    var MAX = 32758;
    var MIN = -32768;
    if (val > MAX) val = MAX;
    if (val < MIN) val = MIN;
    return val;
}

function accelToBuffer(value) {
    var dataArr = [];
    var lenArr = [];
    var totalLen = 0;
    var splineObj;
    for (var i = 0; i < value.accelX.length / 2; i++) {
        totalLen += value.accelX[i * 2 + 1];
        lenArr.push(value.accelX[i * 2 + 1]);
        dataArr.push([value.accelX[i * 2], value.accelY[i * 2], value.accelZ[i * 2]]);
    }
    if (dataArr.length < 2) {
        return [];
    }
    splineObj = Smooth(dataArr);

    var buf = Buffer.allocUnsafe(totalLen * 2 * 3);
    // console.log(buf.byteLength, 'aaaaa');
    var fileP = 0;
    for (i = 0; i < lenArr.length; i++) {
        for (var j = 0; j < lenArr[i]; j++) {
            var val = splineObj(i + (j / lenArr[i])).map(x => validate16Int(Math.round(x * 884.823)));
            // console.log(val[0], val[1], val[1]);

            buf.writeInt16LE(val[0], fileP);
            buf.writeInt16LE(val[1], fileP + 2);
            buf.writeInt16LE(val[2], fileP + 4);
            fileP += 6;
        }
    }
    // console.log(fileP, totalLen * 6);
    return buf;
}

function bufferToDexArray(buffer) {
    var arr = new Array();
    for (var i = 0; i < buffer.length / 2; i++) {
        arr.push(buffer.readInt16LE(i * 2));
    }
    return arr;
}

function buffer12ToDexArray(buffer) {
    var arr = new Array();
    for (var i = 0; i < buffer.length / 3; i = i + 3) {
        var byte = [];
        byte.push(buffer[i]);
        byte.push(buffer[i + 1]);
        byte.push(buffer[i + 2]);
        var rst = parse(byte)
        var value = rst[0] * 4 + (Math.pow(2, 12 - 1));

        arr.push(value);
    }
    return arr;
}

function parse(bytes) {

    var first = (bytes[0] & 0xff) + (bytes[1] & 0xf) * 256;
    if (first > 2048) first = first - 4096;
    var second = ((bytes[1] >> 8) & 0xf) * 256 + (bytes[2] & 0xff);
    if (second > 2048) second = second - 4096;
    var rst = [];
    rst.push(first);
    rst.push(second);
    return rst;

}

function readAccelerometor(filename, position, length) {
    var signals;
    filename = filename + '_accel.dat';
    if (!fs.existsSync(filename)) {
        // console.log('readAccel', 'file not exists', filename);
        return null;
    }
    var filesize = fs.statSync(filename)['size'];

    if (position + length > (filesize / 6)) length = (filesize / 6 - position);

    if (position >= filesize / 6) {
        // console.log('readAccel', 'Exceeds file size', filesize);
        return null;
    }
    var fd = fs.openSync(filename, 'r');
    var buffer = Buffer.allocUnsafe(length * 6);
    fs.readSync(fd, buffer, 0, length * 6, position * 6);
    signals = bufferToDexArray(buffer).map(x => Math.round(x));
    fs.closeSync(fd);
    return signals;
}
var NOTIFICATION_TYPE = {
    SHARE_REQUEST: 0,
    DISALLOW_SHARE: 1,
    ALLOW_SHARE: 2,
    AF_NOTIFICATION: 3,
    STORAGE_LIMMIT: 4
}

function getFileSizeOfDoctor(doctorId) {
    accountModel.findOne({
        _id: mongoose.Types.ObjectId(doctorId)
    }, (err, doc) => {
        if (err || !doc) {
            return 0;
        } else {
            if (doc.size_of_storage > 0)
                return doc.size_of_storage;
            else return 0;
        }
    });
}

function addFileSizeOfDoctor(doctorId, size) {
    accountModel.findOne({
        _id: mongoose.Types.ObjectId(doctorId)
    }, (err, doc) => {
        if (err || !doc) {
            console.log('add FileSize error', 'get pre file size of doctor');
            return 0;
        } else {
            var preSize = doc.size_of_storage > 0 ? doc.size_of_storage : 0;
            accountModel.update({
                    _id: ObjectId(doctorId)
                }, {
                    $set: {
                        size_of_storage: preSize + size
                    }
                },
                (err, raw) => {

                    if (err) {
                        console.log(err, raw, 'add fileSize error', 'update file size error');
                        return 0;
                    }
                    if (raw.nModified) {
                        console.log("------update storage--------", 'current Storage', preSize, 'size', size, 'total storage', preSize + size);
                        return preSize + size;
                    } else return 0;
                })
        }
    });

}

function readAF(filename, position, length, bOne) {
    return AF_Handler.readAF(filename, position, length, bOne);
}

module.exports = {
    SERVER_URL: global.server_url,
    NOTIFICATION_TYPE: NOTIFICATION_TYPE,
    readAccelerometor: readAccelerometor,
    readHR: (res, filename) => {
        HR_Handler.readHR(res, filename);
    },
    readAF: readAF,
    readECG16: (res, filename, position, length, patient) => {
        // length = 10000;
        position = parseInt(position);
        length = parseInt(length);
        var ecgData;
        var ecg_filename = filename + '_ecg.dat';
        var file = randomAccessFile(ecg_filename);

        if (fs.existsSync(ecg_filename)) {
            var filesize = fs.statSync(ecg_filename)['size'];
            if (position + length > filesize / 2) length = filesize / 2 - position;
            if (position >= filesize / 2) {
                res.send({
                    success: false,
                    message: 'position out of data bound',
                    data: null
                });
                return;
            }
            file.read(position * 2, length * 2, function (err, buffer) {
                if (err) {
                    res.send({
                        success: false,
                        message: 'Error',
                        data: null
                    });
                    return;
                }
                ecgData = bufferToDexArray(buffer);
                // ********************************16 af 16 af**************************************************************
                var bAppend = position != 0;
                // console.log('----------------------af analysis-------Begin-----------------------------');
                // console.log(filename, ecgData.length, bAppend, position);

                var duration = 10;
                // var filenameTmp = filename + "_tmp";

                var afData = AF_Handler.readAF(filename, position, length, false);
                file.close(function () {});

                // console.log('----------------------af analysis-------End  -----------------------------', afData);

                var accelData = readAccelerometor(filename, position, length);
                res.send({
                    success: true,
                    message: 'Success',
                    data: {
                        duration: 10,
                        ecg: ecgData,
                        AFs: afData,
                        accel: accelData,
                        totalSample: filesize / 2,
                        position: position,
                        length: length
                    }
                });
            });
        } else {
            console.log('Read ECG:   No resource data exists', filename);
            res.send({
                success: false,
                message: 'Fail',
                data: null
            });
        }
    },
    analysisECG: (res, filename, dataset, patient, isEnd) => {
        var ecgData;
        var ecg_filename = filename + '_ecg.dat';
        var file = randomAccessFile(ecg_filename);

        if (fs.existsSync(ecg_filename)) {
            var filesize = fs.statSync(ecg_filename)['size'];
            file.read(0, filesize, function (err, buffer) {
                if (err) {
                    console.log('file read error', err);
                    if (isEnd) {
                        res.send({
                            success: false,
                            message: ecg_filename + ' read error',
                            data: err
                        });
                    }
                    return;
                }
                ecgData = bufferToDexArray(buffer);
                var bAppend = false;

                var duration = Math.floor(ecgData.length / 500);

                file.close(function () {});
                var isSaveHrt = true;
                AF_Handler.saveAF(res, filename, ecgData, bAppend, patient, duration, dataset, isSaveHrt, isEnd);

            });
        } else {
            console.log('analysis ECG:   No resource data exists', filename);
            if (isEnd) {
                res.send({
                    success: false,
                    message: ecg_filename + ' not exist',
                    data: null
                });
            }
        }
    },
    readECG12: (res, filename, position, length, patient) => {
        // filename = "public/datasets/04126";
        // length = 100000;
        position = parseInt(position);
        length = parseInt(length);
        var ecgData;
        var ecg_filename = filename + '_ecg.dat';
        var file = randomAccessFile(ecg_filename);

        if (fs.existsSync(ecg_filename)) {
            var filesize = fs.statSync(ecg_filename)['size'];
            if (position + length > filesize / 2) length = filesize / 2 - position;
            // console.log(position, filesize, 'File size');
            if (position >= filesize / 2) {
                // console.log(position, filesize, 'File size');
                res.send({
                    success: false,
                    message: 'position out of data bound',
                    data: null
                });
                return;
            }
            file.read(position * 2, length * 2, function (err, buffer) {
                if (err) {
                    res.send({
                        success: false,
                        message: 'Error',
                        data: null
                    });
                    return;
                }
                ecgData = buffer12ToDexArray(buffer);

                // ********************************12 af 12 af**************************************************************

                var algoProcess = new AlgoProcess();
                for (i = 300; i < ecgData.length; i++) {
                    curY = ecgData[i];
                    preY = ecgData[i - 1];
                    midY = (curY + preY) / 2;
                    algoProcess.AlgoProcess(midY, i);
                    algoProcess.AlgoProcess(curY, i);
                }
                console.log('****************** result ******************:  ', algoProcess.detectedCounter1);
                // ********************************12 af 12 af**************************************************************
                file.close(function () {});
                var accelData = readAccelerometor(filename, position, length);
                var afData = AF_Handler.readAF(filename, position, length, false);
                res.send({
                    success: true,
                    message: 'Success',
                    data: {
                        duration: 10,
                        ecg: ecgData,
                        AFs: afData,
                        accel: accelData,
                        totalSample: filesize / 2,
                        position: position,
                        length: length
                    }
                });
            });
        } else {
            console.log('Read ECG:   No resource data exists', filename);
            res.send({
                success: false,
                message: 'Fail',
                data: null
            });
        }
    },
    getFileSize(filename) {
        var ecg_filename = filename + '_ecg.dat';
        if (fs.existsSync(ecg_filename)) {
            var filesize = fs.statSync(ecg_filename)['size'];
            return filesize;
        } else {
            return 0;
        }
    },

    saveEcgToFile: (res, value, owner, datetime, duration, bAppend) => {
        var ownerId = owner.id;

        var ownerAge = (new Date().getFullYear()) - (new Date(owner.birthday).getFullYear());
        var filename = `public/datasets/${ownerId}${new Date(datetime).getTime()}`;
        var ecg_signalfile = `${filename}_ecg.dat`;

        var recordfile = `${ownerId}${new Date(datetime).getTime()}`;
        var af_file = `${filename}_af.dat`;

        const ecg_buf = ecgToBuffer(value.ecg);

        if (!bAppend) {
            fs.writeFileSync(ecg_signalfile, ecg_buf);
            var stats = fs.statSync(ecg_signalfile);
            var sampleCount = stats['size'] / 2;

            var size = stats['size'];
            addFileSizeOfDoctor(ownerId, size);

            // var isSaveHrt = false;
            // var isEnd = false;
            // AF_Handler.saveAF(res, filename, value.ecg, bAppend, owner, duration, null, isSaveHrt, isEnd);
            // **********************************************************************************************
            return filename;
        } else {
            var stats = fs.statSync(ecg_signalfile);
            var preSize = stats['size'];

            fs.appendFileSync(ecg_signalfile, ecg_buf);
            var stats = fs.statSync(ecg_signalfile);
            var sampleCount = stats['size'] / 2;

            var size = stats['size'];
            addFileSizeOfDoctor(ownerId, size - preSize);

            // HR_Handler.saveHR(hr_file, value.heartRate, patient, duration, bAppend);
            // **********************************************************************************************
            // var isSaveHrt = false;
            // AF_Handler.saveAF(res, filename, value.ecg, bAppend, owner, duration, null, isSaveHrt, isEnd);
            // **********************************************************************************************
            return filename;
        }
    },

    responseHandler: (res, success, message, data) => {
        res.send({
            success: success,
            message: message,
            data: data
        });
    },
    bufferToDexArray: bufferToDexArray
}