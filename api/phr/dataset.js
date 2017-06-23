var express = require('express');

var randomAccessFile = require('random-access-file');

var router = express.Router();
var mongoose = require('mongoose');
// var journalSchema = require('../../model/phr').journalSchema;
// var journalModel = mongoose.model('Journal', journalSchema);
var datasetSchema = require('../../model/phr').datasetSchema;
var datasetModel = mongoose.model('Dataset', datasetSchema);
var patientSchema = require('../../model/identities').patientSchema;
var patientModel = mongoose.model('Patient', patientSchema);

var accountSchema = require('../../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
var ObjectId = mongoose.Types.ObjectId;

var UTIL = require('../../lib/util');
var async = require('async');
var fs = require('graceful-fs');
const fsextra = require('fs-extra')
var LevelConfig = require('../../model/identities').LevelConfig;

var NotifiUtil = require('../notification/noti-util');
var aws = require('aws-sdk');
var LambdaFunction = require('../../Lambda function/arrhythmia');

router.post('/add', (req, res) => {
    // console.log(req.body);
    var value = req.body.value;
    var ownerId = req.body.ownerId;
    var datetime = new Date(req.body.datetime);
    var duration = req.body.value.duration;
    var bNew = true;
    var type = req.body.type;
    var ownerName = req.body.ownerName;
    var data;

    bNew = req.body.value.id == 1 ? true : false;

    accountModel.findOne({
        _id: mongoose.Types.ObjectId(ownerId)
    }, (err, doc) => {
        if (err || !doc) {
            UTIL.responseHandler(res, false, "Error1", null);
            return;
        } else {
            var nLevel = doc.level > 0 ? doc.level : 0;
            var storage = doc.size_of_storage > 0 ? doc.size_of_storage : 0;

            // if limmitted
            if (storage >= LevelConfig.value[nLevel].sizeOfStorage) {
                console.log("Storage limmited", storage, LevelConfig.value[nLevel].sizeOfStorage);
                UTIL.responseHandler(res, false, "Error Storage limmited", null);
                NotifiUtil.pushNotification('58882b928d28071628049126', ownerId, 4, 'Storage limmited', '', '', '');
                return 0;
            }
            var filename = `public/datasets/${ownerId}${new Date(datetime).getTime()}`;
            data = {
                filename: filename
            };
            UTIL.saveEcgToFile(res, value, doc, datetime, duration, !bNew);
            insertDataSets(res, bNew, datetime, ownerId, ownerName, type, data, duration);

            console.log("ECG Upload", 'Saved ECG data to storage successfully');
        }
    });
});

router.post('/update-duration', (req, res) => {
    var datetime = req.body.datetime;
    var duration = req.body.duration;
    var userId = req.body.ownerId;
    console.log('update duration', req.body);
    datasetModel.update({
        datetime: datetime,
        ownerId: mongoose.Types.ObjectId(userId),
        type: type}, {duration: duration});
    UTIL.responseHandler(res, true);
})

function insertDataSets(res, bNew, datetime, ownerId, ownerName, type, data, duration) {
    console.log('Dataset uploading...', datetime);
    datasetModel.findOne({
        datetime: datetime,
        ownerId: mongoose.Types.ObjectId(ownerId),
        type: type
    }, (err, dataset) => {
        console.log(dataset);
        if (dataset) bNew = false;
        if (bNew) {
            console.log("Writing new dataset into database...", data);
            var datasetDoc = new datasetModel({
                datetime: datetime,
                type: type,
                ownerId: mongoose.Types.ObjectId(ownerId),
                ownerName: ownerName,
                data: data,
                duration: duration
            });
            datasetDoc.save((err, doc, num) => {
                if (err) res.send({
                    successs: false,
                    message: 'Error',
                    data: null
                });

                else {
                    res.send({
                        success: true,
                        message: 'Success',
                        data: doc
                    });
                    accountModel.update({
                            _id: mongoose.Types.ObjectId(ownerId)
                        }, {
                            $push: {
                                datasets: mongoose.Types.ObjectId(doc._id)
                            }
                        },
                        (err, raw) => {});
                }
            })
        } else {
            datasetModel.update({
                datetime: datetime,
                ownerId: mongoose.Types.ObjectId(ownerId),
                type: type
            }, {duration: duration + dataset.duration}, (err, raw) => {
                console.log('dataset duration', dataset.duration + duration);
            })
            UTIL.responseHandler(res, true, 'Success', null);
        }
    });
}
router.post('/comment/:id', (req, res) => {

    var doctorId = req.body.doctorId;
    var doctorName = req.body.doctorName;
    var doctorPhoto = req.body.doctorPhoto;

    var content = req.body.content;
    var created = new Date(req.body.created);
    var commentSet = {
        doctorId: mongoose.Types.ObjectId(doctorId),
        doctorName: doctorName,
        doctorPhoto: doctorPhoto,
        content: content,
        created: created
    };
    // console.log('d:', doctorId, 'c', content, 'created', created, commentSet)

    datasetModel.update({
        _id: mongoose.Types.ObjectId(req.params.id),
    }, {
        $push: {
            comment: commentSet
        }
    }, (err, raw) => {
        if (err) {
            console.log("error", err);
            UTIL.responseHandler(res, false, "comment error", err);
        } else {
            if (raw) {
                console.log("success", raw);
                UTIL.responseHandler(res, true, "Success", raw);
            }
        }
    });
});

router.post('/analysis/', (req, res) => {
    var module = req.body.module;

    var datasetIds = req.body.datasetIds;
    var arrObjectId = [];

    datasetIds.forEach(function (x) {
        arrObjectId.push(ObjectId(x));
    });

    var arrFilename = [];
    datasetModel.find({
        '_id': {
            $in: arrObjectId
        }
    }, (err, docs) => {
        if (err) {
            console.log('analysis error at get dataset for mongodb', err);
            UTIL.responseHandler(res, false, "analysis error at get dataset for mongodb ", err);
        } else if (docs) {
            docs = docs.filter(function (value) {
                if (value.type == "ECG") return true;
                else return false;
            });
            analysis(res, docs);
        }
    });

});
router.get('/get-comment/:id', (req, res) => {
    datasetModel.findById(req.params.id, (err, doc) => {
        if (err) res.send({
            successs: false,
            message: 'Error',
            data: null
        });
        else {
            if (doc) {
                // console.log('-------------', doc.comment);
                UTIL.responseHandler(res, true, `Successfully returned Comment: ${req.params.id}`, doc.comment);
            } else
                UTIL.responseHandler(res, false, 'Not found such dataset', null);
        }
    });
});

router.get('/get/:id', (req, res) => {
    datasetModel.findById(req.params.id, (err, doc) => {
        if (err) res.send({
            successs: false,
            message: 'Error',
            data: null
        });
        else {
            if (doc)
                UTIL.responseHandler(res, true, `Successfully returned dataset with id: ${req.params.id}`, doc);
            else
                UTIL.responseHandler(res, true, 'Not found such dataset', null);
        }
    })
})
router.post('/get', (req, res) => {
    // var reqq = JSON.parse(req.body);
    console.log('Dataset Request:   ', req.body);
    // req.body = reqq;
    var datefrom = new Date(req.body.datefrom);
    var dateto = new Date(req.body.dateto);
    var owners = req.body.ownerIds.map((x) => mongoose.Types.ObjectId(x));
    var datatype = "" + req.body.datatype; // convert to string
    datatype = datatype.toLocaleLowerCase();
    var filter = {
        ownerId: {
            $in: owners
        },
        type: datatype,
        datetime: {
            $gte: datefrom,
            $lte: dateto
        }
    }

    if (req.body.datefrom == "" || req.body.dateto == "") delete filter.datetime;
    if (datatype == "" || datatype == "all") delete filter.type;

    datasetModel.find(filter, (err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else {
            docs = docs.sort(function (a, b) {
                return a.datetime - b.datetime
            })
            res.json({
                success: true,
                message: 'Success',
                data: docs
            });
        }
    });
})
router.delete('/delete/:id', (req, res) => {
    console.log('Dataset Delete Request:   ', req.params.id);
    datasetModel.findOne({
        _id: ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !doc) {
            console.log('err', err);
            UTIL.responseHandler(res, false, "can not find dataset from MongoDB", null);
        } else if (doc) {
            var filename = doc.data.filename;
            deleteDatasetFile(req, res, filename);
        }
    });
})

function deleteDatasetFile(req, res, _filename) {
    // let ecg = _filename + '_ecg.dat';
    // let acc = _filename + '_accel.dat';
    console.log('will remove: ' + _filename);
    const datasetsFolder = 'public/datasets/';

    async.waterfall([
        function (done) {
            fs.readdir(datasetsFolder, (err, arrfileName) => {
                console.log('result before', arrfileName.length);
                arrfileName = arrfileName.filter((itemFileName, index) => {
                    var filePath = datasetsFolder + itemFileName;
                    return filePath.indexOf(_filename) !== -1;
                });
                var arrDeletefileName = [];
                arrfileName.map(item => {
                    console.log(item);
                    arrDeletefileName.push(datasetsFolder + item);
                });

                console.log('result after', arrfileName.length);
                arrDeletefileName.map(item => {
                    console.log(item);
                });
                done(null, arrDeletefileName);
            });
        },
        function (_arrFilename, callback) {
            console.log('function1');
            async.eachSeries(_arrFilename, function iterator(item, callback) {
                fsextra.remove(item, err => {
                    if (err) {
                        callback("error");
                    }
                    console.log('success delete: ', item);
                    callback(null);
                });
            }, function done() {
                //...
                console.log('done');
                callback(null, 'success');
            });
        },
        function (done) {
            console.log('function2');
            removeDatasetFromDB(req, res);
        }
    ], function (err) {
        if (err) {
            res.send({
                success: false,
                message: 'Error while delete file'
            });
        }

    });
}

function removeDatasetFromDB(req, res) {

    datasetModel.remove({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err) => {
        console.log(req.params.id);
        if (err) {
            console.log('err', err);
            res.send({
                success: false,
                message: 'Error while delete dataset'
            });
        } else {
            console.log('success');
            res.send({
                success: true,
                message: 'Successfully delete the dataset'
            });
        }
    });
}
router.post('/get-stream', (req, res) => {
    var id = req.body.id;
    var position = req.body.position;
    var length = req.body.length;

    datasetModel.findById(id, (err, doc) => {
        if (err) UTIL.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                if (doc.data) {
                    var filename = doc.data.filename;
                    var ownerId = doc.ownerId;
                    accountModel.findById(ownerId, (err, doc) => {
                        if (err) {
                            console.error('Error while receiving ECG data', err);
                            UTIL.responseHandler(res, false, "Error while receiving ECG data", null);
                            return;
                        } else if (doc) {
                            var patient = doc;
                            UTIL.readECG16(res, filename, position, length, patient);
                        }
                    });

                }
            } else {
                UTIL.responseHandler(res, false, 'Not found', null);
            }
        }
    })
});
router.post('/get-hr', (req, res) => {
    var id = req.body.id;
    datasetModel.findById(id, (err, doc) => {
        if (err) UTIL.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                if (doc.data == undefined) {
                    UTIL.responseHandler(res, false, 'Not Heart rate found', null);
                    return;
                }
                var filename = doc.data.filename;

                UTIL.readHR(res, filename);
            } else {
                UTIL.responseHandler(res, false, 'Not Heart rate found', null);
            }
        }
    })
});
router.post('/get-af', (req, res) => {
    var id = req.body.id;
    datasetModel.findById(id, (err, doc) => {
        if (err) UTIL.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                var filename = doc.data.filename;
                var af = UTIL.readAF(filename, -1, -1, true);
                UTIL.responseHandler(res, true, 'Success', {
                    AFs: af
                });
            } else {
                UTIL.responseHandler(res, false, 'Not found', null);
            }
        }
    })
});


router.get('/get-latest-data/:patientId', (req, res) => {
    var data = {
        ecg: [],
        weight: Number,
        BP: {
            SYS: Number,
            DIA: Number,
            HR: Number
        },
        activity: {
            slow: Number,
            normal: Number,
            fast: Number,
            CALORY: Number
        },
        ecgID: "",
        ecgTime: new Date()
    };

    var patientId = req.params.patientId;

    async.waterfall([
        (callback) => {
            datasetModel.find({
                    patientId: mongoose.Types.ObjectId(patientId),
                    type: "ECG"
                }) //  Get Latest ECG data
                .sort({
                    datetime: -1
                })
                .exec((err, docs) => {
                    if (err || docs.length == 0)
                        data.ecg = null;
                    else {
                        var length = 1500;
                        var position = 4500;
                        var signals;

                        var filename = docs[0].data.filename + '_ecg.dat';
                        if (!fs.existsSync(filename)) {
                            console.log('Opening latest ECG data', 'file not exists', filename);
                            data.ecg = null;
                        } else {
                            var fd = fs.openSync(filename, 'r');
                            var buffer = Buffer.allocUnsafe(length * 2);
                            fs.readSync(fd, buffer, 0, length * 2, position * 2);
                            signals = UTIL.bufferToDexArray(buffer).map(x => Math.round(x));
                            fs.closeSync(fd);
                            data.ecg = signals;
                            data.ecgID = docs[0]._id;
                            data.ecgTime = docs[0].datetime;
                        }
                    }
                    callback();
                });
        },
        (callback) => { // Get Latest Weight Data
            datasetModel.find({
                    patientId: mongoose.Types.ObjectId(patientId),
                    type: "WEIGHT"
                })
                .sort({
                    datetime: -1
                })
                .exec((err, docs) => {
                    if (err || docs.length == 0)
                        data.weight = null;
                    else {
                        console.log("Get latest BP data", docs[0]);
                        data.weight = docs[0].data.weight;
                    }
                    callback();
                });
        },
        (callback) => { // Get Latest Activity Data
            datasetModel.find({
                    patientId: mongoose.Types.ObjectId(patientId),
                    type: "ACTIVITY"
                })
                .sort({
                    datetime: -1
                })
                .exec((err, docs) => {
                    if (err || docs.length == 0)
                        data.activity = null;
                    else {
                        console.log("Get latest ACTIVITY data", docs[0]);
                        data.activity.CALORY = docs[0].data.activity.CALORY;
                    }
                    callback();
                });
        },
        (callback) => { // Get Latest BP Data
            datasetModel.find({
                    patientId: mongoose.Types.ObjectId(patientId),
                    type: "BP"
                })
                .sort({
                    datetime: -1
                })
                .exec((err, docs) => {
                    if (err || docs.length == 0)
                        data.BP = null;
                    else {
                        console.log("Get latest BP data", docs[0]);
                        data.BP.SYS = docs[0].data.SYS;
                        data.BP.DIA = docs[0].data.DIA;
                        data.BP.HR = docs[0].data.HR;
                    }
                    UTIL.responseHandler(res, true, "Successfully returned latest data", data);
                });
        }
    ], (err, result) => {
        console.log('Get Latest Data Finished', err, result);
        if (err) UTIL.responseHandler(res, false, "Error while fetching latest data", null);
    });
});

router.post('/addatafromfiles/', (req, res) => {
    const testFolder = 'public/datasets/';
    var strArr = [];
    var counts = [];
    async.waterfall([
        function (done) {
            fs.readdir(testFolder, (err, files) => {
                var num = 0;
                var num2 = 0;
                var fileList = [];
                files.map(file => {
                    var first = file.substr(0, 37);

                    fileList.push(first);
                    // var filename = 'public/datasets/' + first;
                    // // console.log("kk", first)

                });
                console.log(fileList.length);
                fileList = fileList.filter(function (item, pos) {
                    return fileList.indexOf(item) == pos;
                });
                console.log(fileList.length);
                console.log(fileList[0]);
                fileList.map(item => {
                    var dateStr = item.substr(item.length - 13, item.length);
                    var dateN = parseInt(dateStr);
                    var date = new Date(dateN);

                    // saveFile(filename, true);
                    var filename = 'public/datasets/' + item;
                    // console.log(filename);
                    findMongo(filename, date);

                    // strArr.push(date);
                });

            });
        },
        function (done) {

            strArr.forEach(function (x) {
                counts[x] = (counts[x] || 0) + 1;
            });
        },
        function (done) {
            console.log(counts);

        }
    ], function (err) {
        if (err) return next(err);
        // res.redirect('/');
    });
});

router.post('/export-dataset/', (req, res) => {
    var datasetId = req.body.id;
    var type = req.body.type;
    datasetModel.findOne({
        _id: ObjectId(datasetId)
    }, (err, doc) => {
        if (err || !doc) {
            console.log('err', err);
            UTIL.responseHandler(res, false, "can not find from MongoDB", null);
        } else if (doc) {
            var filename = doc.data.filename;
            // var patientId = doc.patientId;
            // var patientName = doc.patientName;
            console.log(type);
            if (type == 0) {
                exportCSV(res, filename);
            } else {
                exportMit(res, filename);
            }
        }
    });
});
router.post('/monitor-lambda-analysis/', (req, res) => {
    console.log('monitor lambda function');
    var ecg = req.body.ecg;
    var position = req.body.position;
    var data = {
        ecg: ecg,
        position: position
    };
    LambdaFunction.analysis(data, null, res);
});
router.get('/download-app/', (req, res) => {
    var filename = 'public/app/calm-app.apk';
    res.download(filename);

});
router.get('/download-firmware/', (req, res) => {
    var filename = 'public/app/BMD350.zip';
    res.download(filename);
});


function exportMit(res, filename) {
    var arrFileName = [];
    var ecg_filename = filename + '_ecg.dat';
    if (fs.existsSync(ecg_filename)) {
        ecg_filename = ecg_filename.substr(16, ecg_filename.length);
        arrFileName.push(ecg_filename);
    }
    var acc_filename = filename + '_accel.dat';
    if (fs.existsSync(acc_filename)) {
        acc_filename = acc_filename.substr(16, acc_filename.length);
        arrFileName.push(acc_filename);
    }
    UTIL.responseHandler(res, true, "Success", arrFileName);
}

function exportCSV(res, filename) {
    var arrFileName = [];
    async.waterfall([
            // read ecg file to buffer , write csv
            function (done) {
                var ecg_filename = filename + '_ecg.dat';
                var file = randomAccessFile(ecg_filename);

                if (fs.existsSync(ecg_filename)) {
                    var filesize = fs.statSync(ecg_filename)['size'];

                    file.read(0, filesize, function (err, ecgBuffer) {
                        if (err) {
                            console.log('read ecg fail');
                        }
                        var ecgData = UTIL.bufferToDexArray(ecgBuffer);
                        var ecg_resultfile = filename + "_ecg.result.csv";
                        for (var i = 0; i < ecgData.length; i++) {
                            if (i == 0) fs.writeFileSync(ecg_resultfile, ecgData[i] + "\n");
                            else {
                                fs.appendFileSync(ecg_resultfile, ecgData[i] + "\n");
                            }
                        }
                        ecg_resultfile = ecg_resultfile.substr(16, ecg_resultfile.length);
                        arrFileName.push(ecg_resultfile);
                        done(null, filename, filesize);
                    });
                    file.close(function () {});
                } else {
                    console.log('ecg file not exist');
                }
            },
            //read accelemeter file to data, write csv
            function (filename, filesize, done) {
                var accData = UTIL.readAccelerometor(filename, 0, filesize);
                if (accData != null) {
                    var acc_resultfile = filename + "_acc.result.csv";
                    console.log('khs:', accData.length);
                    for (var i = 0; i < accData.length / 3; i++) {
                        if (i == 0) {
                            fs.writeFileSync(acc_resultfile, "x, y, z\n");
                            fs.writeFileSync(acc_resultfile, accData[3 * i] + "," + accData[3 * i + 1] + "," + accData[3 * i + 2] + "\n");
                        } else {
                            fs.appendFileSync(acc_resultfile, accData[3 * i] + "," + accData[3 * i + 1] + "," + accData[3 * i + 2] + "\n");
                        }
                    }
                    acc_resultfile = acc_resultfile.substr(16, acc_resultfile.length);
                    arrFileName.push(acc_resultfile);
                }
                done(null, filename);
            },

            function (filename, done) {
                console.log('csv file', arrFileName);
                UTIL.responseHandler(res, true, "Success", arrFileName);
            },
            // function (deletefilename, done) {
            //     // fs.unlink(deletefilename, (err) => {
            //     //     if (err) console.log('delete error');
            //     //     else console.log('successfully deleted ');
            //     // });
            // }
        ],
        function (err) {
            if (err) console.log('err', err);

        });
}

function saveFile(dataStr, bAppend) {

    var filenameTmp = 'public/datasets/' + "33.txt"
    if (bAppend) {
        if (fs.existsSync(filenameTmp)) {
            fs.appendFileSync(filenameTmp, dataStr + ',');
        } else {
            fs.writeFileSync(filenameTmp, dataStr + ',');
        }
    } else {
        fs.writeFileSync(filenameTmp, dataStr + ',');
    }
}

function findMongo(filename, date) {
    datasetModel.findOne({
        'data.filename': {
            $ne: filename
        }
    }, (err, doc) => {
        if (err) {
            console.log('error');
        } else if (doc) {
            // if (doc.length == 0) {
            console.log('ok', doc._id, doc.type);

            saveMongo(date, filename);
            // }
        }
    });
}
var savedDataset = 0;

function saveMongo(date, filename) {
    var datasetDoc = new datasetModel({
        datetime: date,
        type: "ECG",
        patientId: mongoose.Types.ObjectId('58dfdc24ca67296e5f650831'),
        patientName: 'File1 File2',
        data: {
            filename: filename
        }
    });
    datasetDoc.save((err, doc, num) => {
        if (err) {
            console.log('err', err);
        } else if (doc.length) {
            console.log(doc, num);
        }
    });
}

function analysis(res, _doc) {
    _doc.forEach((dataset, index, arr) => {
        patientModel.findOne({
            _id: dataset.patientId
        }, (err, patientDoc) => {
            if (err) {
                res.send({
                    success: false,
                    message: 'Error:' + index,
                    data: null
                });
            } else if (patientDoc) {
                var filename = dataset.data.filename;
                var isEnd = index == _doc.length - 1; // flag for result at end of process
                UTIL.analysisECG(res, filename, dataset, patientDoc, isEnd);
            }
        });
    });
}

module.exports = router;