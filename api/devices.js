var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var deviceSchema = require('../model/identities').deviceSchema;
var deviceModel = mongoose.model('Device', deviceSchema);
var patientSchema = require('../model/identities').patientSchema;
var patientModel = mongoose.model('Patient', patientSchema);
var accountSchema = require('../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
var ObjectID = mongoose.Schema.ObjectId;
var Util = require('../lib/util');

router.post('/register', (req, res) => {
    deviceModel.find({
        mac: {
            $in: req.body.devices.map(x => x.mac)
        }
    }, (err, doc) => {
        if (err) {
            res.status(400).send({
                success: false,
                message: 'Unexpected error occured finding device.'
            });
            return;
        }
        console.log('doc.length', doc.length);
        if (doc.length > 0) {
            deviceModel.remove({
                mac: {
                    $in: doc.map(x => x.mac)
                }
            }, (err) => console.log(err, 'duplicated device removed'));
        }

        accountModel.findOne({
            _id: req.body.ownerId
        }, (err, doc) => {
            if (err) res.send({
                success: false,
                message: 'Error'
            });
            else {
                if (doc) {
                    var devices = req.body.devices.map(x => {
                        x.ownerId = req.body.ownerId;
                        x.ownerName = doc.firstname + ' ' + doc.lastname;
                        x.gateway = req.body.gatewayMac;
                        return x;
                    })

                    deviceModel.insertMany(devices, (err, doc) => {
                        if (err) res.send({
                            success: false,
                            message: err
                        });
                        else {
                            accountModel.update({
                                _id: req.body.ownerId
                            }, {
                                $push: {
                                    devices: doc.map(x => x._id)
                                }
                            }, (err, raw) => console.log(err, raw));
                            res.send({
                                success: true,
                                message: 'Device successfully added'
                            });
                        }
                    });
                } else {
                    Util.responseHandler(res, false, 'Not found', null);
                }
            }
        })
    });
});
router.get('/get/', (req, res) => {
    deviceModel.find((err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Unexpected error occured',
            data: null
        });
        else
            res.send({
                success: true,
                message: 'Successfully returned data',
                data: docs
            });
    })
});
router.get('/get/:id', (req, res) => {
    deviceModel.find({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Unexpected error occured',
            data: null
        });
        res.send({
            success: true,
            message: 'Successfully returned data',
            data: docs[0]
        });
    })
});
router.get('/get-by-gateway/:mac', (req, res) => {
    deviceModel.find({
        gateways: req.params.mac
    }, (err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else res.send({
            success: true,
            message: 'Success returned device list',
            data: docs
        });
    })
})
router.get('/get-by-patient/:id', (req, res) => {
    deviceModel.find({
        patientId: req.params.id
    }, (err, docs) => {
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null
        });
        else res.send({
            success: true,
            message: 'Success returned device list',
            data: docs
        });
    })
})
router.get('/get-by-doctor-gateway/:id/:mac', (req, res) => {
    console.log(req.body);
    var ownerIDs;
    accountModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null)
        else {
            ownerIDs = [mongoose.Types.ObjectId(req.params.id)];
            deviceModel.find({
                ownerId: {
                    $in: ownerIDs
                },
                gateway: req.params.mac
            }, (err, devices) => {
                if (err) res.send({
                    success: false,
                    message: 'Error',
                    data: null
                });
                else {
                    res.send({
                        success: true,
                        message: 'Success',
                        data: devices
                    });
                }
            });
        }
    });
});
router.put('/update/:mac/:gateway', (req, res) => {
    console.log(req.params.id);
    patientModel.findOne({
        _id: req.body.patientId
    }, (err, doc) => {
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else {
            if (doc) {
                deviceModel.update({
                    mac: req.params.mac
                }, {
                    $set: {
                        patientId: String(req.body.patientId),
                        patientName: doc.firstname + ' ' + doc.lastname,
                        gateway: req.params.gateway
                    }
                }, (err, raw) => {
                    if (err) res.send({
                        success: false,
                        message: 'Error'
                    });
                    else res.send({
                        success: true,
                        message: 'Successfully updated the device'
                    });
                });
            } else {
                Util.responseHandler(res, false, 'Not found object with such id', null);
            }
        }
    })
});
router.delete('/delete/:mac', (req, res) => {
    console.log(req.params.id);
    deviceModel.findOneAndRemove({
        mac: req.params.mac
    }, (err, doc) => {
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else {
            console.log('deleted device', doc._id);
            res.send({
                success: true,
                message: 'Successfully deleted the device'
            });
        }
    });
});
module.exports = router;