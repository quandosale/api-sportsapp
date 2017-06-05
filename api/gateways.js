var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var gatewaySchema = require('../model/identities').gatewaySchema;
var gatewayModel = mongoose.model('Gateway', gatewaySchema);
var accountSchema = require('../model/identities').accountSchema;
var doctorModel = mongoose.model('Account', accountSchema);
var deviceSchema = require('../model/identities').deviceSchema;
var deviceModel = mongoose.model('Device', deviceSchema);
var patientSchema = require('../model/identities').patientSchema;
var patientModel = mongoose.model('Patient', patientSchema);
var bCrypt = require('bcrypt-nodejs');
var Util = require('../lib/util');

router.post('/register', (req, res) => {

    gatewayModel.insertMany([req.body]).then(doc => {
        doctorModel.update({
            _id: mongoose.Types.ObjectId(doc[0].owner)
        }, {
            $push: {
                gateways: doc[0]._id
            }
        }, (err, raw) => console.log(err, raw));
        res.send({
            success: true,
            message: 'Gateway succesfully registered...'
        })
    });
});
router.post('/auth', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    console.log(req.body, 'Authentication request from gateway');
    doctorModel.findOne({
        username: username
    }, (err, doc) => {
        if (err) res.send({
            success: false,
            message: 'Error',
            data: null,
            bLink: false
        });
        else {
            if (!doc) res.send({
                success: false,
                message: 'No such account',
                data: null,
                bLink: false
            });
            else {
                if (isValidPassword(doc, password)) {
                    var bLink = false;
                    var deactivate = false;
                    gatewayModel.findOne({
                        mac: req.body.mac,
                        owner: mongoose.Types.ObjectId(doc._id)
                    }).then(gateway => {
                        if (gateway) {
                            bLink = true;
                            if (gateway.deactivate) {
                                deactivate = true;
                                bLink = false;
                            }
                        }

                        res.send({
                            success: true,
                            message: 'Success',
                            data: doc,
                            bLink: bLink,
                            deactivate: deactivate
                        });
                    });
                } else
                    res.send({
                        success: false,
                        message: 'Invalid username or password',
                        data: null,
                        bLink: false
                    });
            }
        }
    });
});
router.get('/get/:mac/:id', (req, res) => {

    var patientIDs;
    doctorModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null)
        else {
            if (doc) {
                patientIDs = doc.patients.map(x => mongoose.Types.ObjectId(x));
                deviceModel.find({
                    patientId: {
                        $in: patientIDs
                    },
                    gateways: req.params.mac
                }, (err, devices) => {
                    patientModel.find({
                        gateways: req.params.mac,
                        "doctor.id": mongoose.Types.ObjectId(req.params.id)
                    }, (err, patients) => {
                        if (err) res.send({
                            success: false,
                            message: 'Error',
                            data: null
                        });
                        else {
                            gatewayModel.findOne({
                                mac: req.params.mac,
                                owner: mongoose.Types.ObjectId(req.params.id)
                            }, (err, gateway) => {
                                var success, message, data;
                                if (err) {
                                    success = false;
                                    message = "Error";
                                    data = null;
                                    res.send({
                                        success: success,
                                        message: message,
                                        devices: null,
                                        patients: null,
                                        gateway: null,
                                        lastname: null
                                    });
                                } else {
                                    if (gateway) {
                                        success = true;
                                        message = "Found";
                                        data = gateway;
                                        res.send({
                                            success: success,
                                            message: message,
                                            devices: devices,
                                            patients: patients,
                                            gateway: gateway,
                                            lastname: doc.secondname
                                        });
                                    } else {
                                        success = false;
                                        message = "Not Found";
                                        data = gateway;
                                        res.send({
                                            success: success,
                                            message: message,
                                            devices: null,
                                            patients: null,
                                            gateway: null,
                                            lastname: null
                                        });
                                    }
                                }
                            });
                        }
                    });
                });
            }
        }
    });
});
router.get('/get/:mac', (req, res) => {
    gatewayModel.findOne({
        mac: req.params.mac
    }, (err, doc) => {
        var success, message, data;
        if (err) {
            success = false;
            message = "Error";
            data = null;
        } else {
            if (doc) {
                success = true;
                message = "Found";
                data = doc;
            } else {
                success = false;
                message = "Not Found";
                data = doc;
            }
        }
        res.send({
            success: success,
            message: message,
            data: data
        });
    });
});
router.get('/get-by-doctor/:id', (req, res) => {
    gatewayModel.find({
        owner: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        var success, message, data;
        if (err) {
            success = false;
            message = "Error";
            data = null;
        } else {
            if (doc) {
                success = true;
                message = "Found";
                data = doc;
            } else {
                success = false;
                message = "Not Found";
                data = doc;
            }
        }
        res.send({
            success: success,
            message: message,
            data: data
        });
    });
});
router.put('/update/:mac/:id', (req, res) => {
    console.log('update');
    gatewayModel.update({
        mac: req.params.mac,
        owner: mongoose.Types.ObjectId(req.params.id)
    }, {
        $set: req.body
    }, {
        upsert: true
    }, (err, raw) => {
        if (err) Util.responseHandler(res, false, 'Error', null);
        else Util.responseHandler(res, true, 'Success', null);
    });
});
router.put('/update/:id', (req, res) => {
    console.log('req.body', req.body);
    gatewayModel.update({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, {
        $set: req.body
    }, {
        upsert: true
    }, (err, raw) => {
        console.log(req.body, err, raw, 'Update Gateway Setting...');
        if (err) Util.responseHandler(res, false, 'Error', null);
        else Util.responseHandler(res, true, 'Success', null);
    });
});
router.put('/deactivate/', (req, res) => {

    gatewayModel.remove({
        _id: mongoose.Types.ObjectId(req.body.gatewayId),
        owner: mongoose.Types.ObjectId(req.body.doctorId)
    }, (err, raw) => {
        if (err) {
            console.log('deactivate gateway', err, raw);
            Util.responseHandler(res, false, "Error", null);
        } else {
            doctorModel.update({
                _id: mongoose.Types.ObjectId(req.body.doctorId)
            }, {
                $pull: {
                    gateways: mongoose.Types.ObjectId(req.body.gatewayId)
                }
            }, (err, raw) => {
                if (err) {
                    Util.responseHandler(res, false, "update gateway fail", null);
                } else if (raw) {
                    Util.responseHandler(res, true, "Success", null);
                }
            });
        }
    });
});

var isValidPassword = function (account, password) {
    return bCrypt.compareSync(password, account.password);
};
module.exports = router;