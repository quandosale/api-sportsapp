var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var patientSchema = require('../model/identities').patientSchema;
var accountSchema = require('../model/identities').accountSchema;
var patientModel = mongoose.model('Patient', patientSchema);
var doctorModel = mongoose.model('Account', accountSchema);
var datasetSchema = require('../model/phr').datasetSchema;
var datasetModel = mongoose.model('Dataset', datasetSchema);
var fs = require('graceful-fs');
var Util = require('../lib/util');
var LevelConfig = require('../model/identities').LevelConfig;

var accountSchema = require('../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
router.get('/get/', (req, res) => {
    patientModel.find((err, docs) => {
        if (err) res.send({
            success: false,
            data: null
        });
        res.send({
            success: true,
            data: docs
        });
    });
});
router.get('/get-by-doctor/:id', (req, res) => {
    doctorModel.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !doc) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else {
            patientModel.find({
                _id: {
                    $in: doc.patients
                }
            }, (err, docs) => {
                res.send({
                    success: true,
                    message: 'Succeses',
                    data: docs
                });
            })
        }
    });
})
// Get by doctor, exclude who is registered in a gateway with specified mac
router.get('/get-by-doctor/:id/:mac', (req, res) => {
    doctorModel.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !res) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else {
            patientModel.find({
                _id: {
                    $in: doc.patients
                },
                gateways: {
                    $nin: [req.params.mac]
                }
            }, (err, docs) => {
                console.log(docs, 'get-by-doctor/:id/:mac');
                res.send({
                    success: true,
                    message: 'Succeses',
                    data: docs
                });
            })
        }
    });
})
router.get('/get-by-gateway/:mac', (req, res) => {
    patientModel.find({
        gateways: req.params.mac
    }, (err, docs) => {
        console.log(docs);
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else res.send({
            success: true,
            message: 'Success',
            data: docs
        });
    })
})
router.get('/get-by-doctor-gateway/:id/:mac', (req, res) => {
    patientModel.find({
        gateways: req.params.mac,
        "doctor.id": mongoose.Types.ObjectId(req.params.id)
    }, (err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else res.send({
            success: true,
            message: 'Success',
            data: docs
        });
    })
})
router.get('/:id/get-networked-patients', (req, res) => {
    doctorModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                // console.log('get networked patients', req.params.id, doc.accounts.map(x => mongoose.Types.ObjectId(x.id)));
                patientModel.find({
                    "doctor.id": {
                        $in: doc.accounts.map(x => mongoose.Types.ObjectId(x))
                    }
                }, (err, docs) => {
                    // console.log('get networked patients', req.params.id, err, docs);
                    Util.responseHandler(res, true, 'Success', docs);
                })
            } else
                Util.responseHandler(res, false, 'No such account with ID' + req.params.id, null);
        }
    })
})
router.get('/:id/get-networked-shared-patients', (req, res) => {

    doctorModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                // console.log('get networked patients', req.params.id, doc.accounts.map(x => mongoose.Types.ObjectId(x.id)));
                patientModel.find({
                    "doctor.id": {
                        $in: doc.shares.map(x => mongoose.Types.ObjectId(x))
                    }
                }, (err, docs) => {
                    // console.log('get networked patients', req.params.id, err, docs);

                    Util.responseHandler(res, true, 'Success', docs);
                })
            } else
                Util.responseHandler(res, false, 'No such account with ID' + req.params.id, null);
        }
    })
})
router.get('/:id/get-networked-no-shared-patients', (req, res) => {

    doctorModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null);
        else {
            if (doc) {
                // console.log('get networked patients', req.params.id, doc.accounts.map(x => mongoose.Types.ObjectId(x.id)));
                patientModel.find({
                    "doctor.id": {
                        $in: doc.accounts.map(x => mongoose.Types.ObjectId(x)),
                        $nin: doc.shares.map(x => mongoose.Types.ObjectId(x))
                    }
                }, (err, docs) => {
                    // console.log('get networked patients', req.params.id, err, docs);

                    Util.responseHandler(res, true, 'Success', docs);
                })
            } else
                Util.responseHandler(res, false, 'No such account with ID' + req.params.id, null);
        }
    })
})
router.get('/get/:id', (req, res) => {
    patientModel.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !doc) res.send({
            success: false,
            data: null
        });
        else {
            var patient = doc;
            doctorModel.findOne({
                _id: patient.doctor
            }, (err, doc) => {
                if (err || !doc) res.send({
                    success: true,
                    data: {
                        patient: patient,
                        doctor: null
                    }
                });
                else res.send({
                    success: true,
                    data: {
                        patient: patient,
                        doctor: doc
                    }
                });
            });
        }
    });
});
router.put('/update/:id', (req, res) => {
    var filepath = 'assets/gravatar/' + req.params.id + 'd.jpg';

    var photoData = req.body.photo;

    console.log(req.body.photo, 'aaaaa');
    if (!photoData.includes('http')) {
        uploadPhoto(photoData, filepath);
        filepath = Util.SERVER_URL + filepath;
        req.body.photo = filepath;
    }

    if (req.body.birthday) {
        console.log('patient update', req.body.birthday);
        req.body.birthday = new Date(req.body.birthday);
    }
    patientModel.findByIdAndUpdate(
        req.params.id, req.body,
        (err, patient) => {

            console.log('patient update', err, patient);
            if (err) res.send({
                success: false,
                message: 'Error'
            });
            else {
                if (patient) {
                    var patientName = req.body.firstname + ' ' + req.body.lastname;
                    console.log('patientNAme', patientName);
                    datasetModel.update({
                        _id: {
                            $in: patient.datasets.map(x => mongoose.Types.ObjectId(x))
                        }
                    }, {
                        $set: {
                            patientName: patientName
                        }
                    }, {
                        multi: true
                    }, (err, raw) => {
                        console.log('patientName Update', err, raw)
                    })
                }
                res.send({
                    success: true,
                    message: 'Updated succesfully'
                });
            }
        });
});
router.put('/add-gateway/:mac', (req, res) => {

    patientModel.update({
        _id: {
            $in: req.body.ids.map(x => mongoose.Types.ObjectId(x))
        }
    }, {
        $push: {
            gateways: req.params.mac
        },
    }, {
        multi: true
    }, (err, raw) => {
        console.log('Add Gateway to Patient', err, raw);
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else res.send({
            success: true,
            message: 'Added gateway successfully'
        });
    })
});
router.post('/register/', (req, res) => {
    var photoData = req.body.photo;
    var doctorId = req.body.doctor.id;
    console.log(photoData, doctorId, 'patient Register');
    var nPatient = getPatientNumberOfDoctor(doctorId);

    accountModel.findOne({
        _id: mongoose.Types.ObjectId(doctorId)
    }, (err, doc) => {
        if (err || !doc) {
            UTIL.responseHandler(res, false, "Error patient get information", null);
        } else {
            var nLevel = doc.level > 0 ? doc.level : 0;
            var nPatient = doc.patients.length > 0 ? doc.patients.length : 0;

            if (nPatient >= LevelConfig.value[nLevel].numberOfPatient) {
                Util.responseHandler(res, false, "Error patient limmited", null);
                return;
            }

            req.body.photo = "";
            patientModel.insertMany([req.body]).then(doc => {
                doctorModel.update({
                    _id: mongoose.Types.ObjectId(doc[0].doctor.id)
                }, {
                    $push: {
                        patients: doc[0]._id
                    }
                }, (err, raw) => console.log(err, raw));
                console.log('New patient created');

                var filepath = 'assets/gravatar/' + doc[0]._id + 'p.jpg';

                if (!photoData.includes('http')) {
                    uploadPhoto(photoData, filepath);
                    filepath = Util.SERVER_URL + filepath;
                } else {
                    filepath = Util.SERVER_URL + 'assets/gravatar/default.jpg';
                }

                console.log(doc[0]._id, req.body.mac);
                var update;
                if (req.body.mac) {
                    update = {
                        $set: {
                            photo: filepath
                        },
                        $push: {
                            gateways: req.body.mac
                        }
                    }
                } else {
                    update = {
                        $set: {
                            photo: filepath
                        }
                    }
                }
                patientModel.update({
                    _id: mongoose.Types.ObjectId(doc[0]._id)
                }, update, (err, raw) => console.log(err, raw));
                res.send({
                    success: true,
                    message: 'Patient succesfully created...',
                    data: doc[0]
                })
            });
        }

    });
});

function getPatientNumberOfDoctor(doctorId) {
    doctorModel.findOne({
        _id: mongoose.Types.ObjectId(doctorId)
    }, (err, doc) => {
        if (err) {
            return 0;
        } else {
            if (doc) {
                var n = doc.patients.length;
                if (n >= 0) {
                    return n;
                }
            }
        }
    });
}

function uploadPhoto(data, filepath) {
    data = data.replace(/^data:image\/jpeg;base64,/, "");
    data = data.replace(/^data:image\/png;base64,/, "");
    var imageBuffer = new Buffer(data, 'base64'); //console = <Buffer 75 ab 5a 8a ...
    fs.writeFile('public/' + filepath, imageBuffer, function (err) {
        console.log(err);
        return filepath;
    });
}

router.post('/photo', (req, res) => {
    uploadPhoto(req.body.img, '1.jpg');
});
router.delete('/delete/:id', (req, res) => {
    patientModel.remove({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err) => {
        console.log(req.params.id);
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else {
            doctorModel.update({
                patients: mongoose.Types.ObjectId(req.params.id)
            }, {
                $pull: {
                    patients: mongoose.Types.ObjectId(req.params.id)
                }
            }, (err, raw) => console.log(err, raw));

            res.send({
                success: true,
                message: 'Successfully deleted the patient'
            });
        }
    });
});

router.delete('/delete-from-gateway/:id/:mac', (req, res) => {
    patientModel.update({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, {
        $pop: {
            gateways: req.params.mac
        }
    }, (err) => {
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else {
            res.send({
                success: true,
                message: 'Successfully removed the patient from gateway'
            });
        }
    });
});


module.exports = router;