var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var patientSchema = require('../model/identities').patientSchema;
var accountSchema = require('../model/identities').accountSchema;
var patientModel = mongoose.model('Patient', patientSchema);
var accountModel = mongoose.model('Account', accountSchema);
var fs = require('graceful-fs');
var bCrypt = require('bcrypt-nodejs');
var ObjectId = mongoose.Types.ObjectId;
var Util = require('../lib/util');

router.get('/get/:id', (req, res) => {
    accountModel.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !doc) res.send({
            success: false,
            data: null
        });
        else {
            res.send({
                success: true,
                data: doc
            })
        }
    });
});

router.get('/get-size-of-storage/:id', (req, res) => {

    accountModel.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, doc) => {
        if (err || !doc) {
            if (err)
                Util.responseHandler(res, false, 'error', null);
        } else {
            var preSize = doc.size_of_storage > 0 ? doc.size_of_storage : 0;
            Util.responseHandler(res, true, 'Success', preSize);
        }
    });
});

router.get('/get', (req, res) => {
    accountModel.find((err, docs) => {
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

router.get('/get-subscription/:id/', (req, res) => {
    accountModel.findOne({
            _id: ObjectId(req.params.id)
        },
        (err, raw) => {
            console.log(err, raw);
            if (err) Util.responseHandler(res, false, 'Connection Error', null);
            if (raw) {
                var level = raw.level > 0 ? raw.level : 0;
                Util.responseHandler(res, true, 'Success', level);
            }

        });
});

router.put('/upgrade-subscription/:id/', (req, res) => {
    var level = req.body.level;
    accountModel.update({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                level: level
            }
        },
        (err, raw) => {
            console.log(err, raw);
            if (err) Util.responseHandler(res, false, 'Connection Error', null);
            if (raw.nModified) Util.responseHandler(res, true, 'Success', null);
            else Util.responseHandler(res, false, 'No Changed', null);
        });
});

router.get('/get-alarmsound/:id/', (req, res) => {
    accountModel.findOne({
            _id: ObjectId(req.params.id)
        },
        (err, raw) => {
            console.log(err, raw);
            if (err) Util.responseHandler(res, false, 'Connection Error', null);
            if (raw) {
                var alarmSound = null;
                if (raw.alarmSound != null)
                    var alarmSound = raw.alarmSound.length > 0 ? raw.alarmSound : null;
                Util.responseHandler(res, true, 'Success', alarmSound);
            }
        });
});

router.put('/upgrade-alarmsound/:id/', (req, res) => {
    var alarmSound = req.body.alarmSound;
    console.log(alarmSound);
    accountModel.update({
            _id: ObjectId(req.params.id)
        }, {
            $set: {
                alarmSound: alarmSound
            }
        },
        (err, raw) => {
            console.log(err, raw);
            if (err) Util.responseHandler(res, false, 'Connection Error', null);
            if (raw.nModified) Util.responseHandler(res, true, 'Success', null);
            else Util.responseHandler(res, false, 'No Changed', null);
        });
});
router.put('/:id/add-network', (req, res) => {
    accountModel.findOne({
        _id: ObjectId(req.params.id),
        accounts: ObjectId(req.body.id)
    }, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Error', null);
        else {
            if (doc) Util.responseHandler(res, false, 'Exists', null);
            else {
                accountModel.update({
                        _id: mongoose.Types.ObjectId(req.params.id)
                    }, {
                        $push: {
                            accounts: ObjectId(req.body.id)
                        }
                    },
                    (err, raw) => {
                        if (err) Util.responseHandler(res, false, 'Error', null);
                        else Util.responseHandler(res, true, 'Success', null);
                    });
            }
        }
    })
});
router.delete('/:id/delete-network/:id1', (req, res) => {
    accountModel.update({
            _id: ObjectId(req.params.id)
        }, {
            $pull: {
                accounts: mongoose.Types.ObjectId(req.params.id1)
            }
        },
        (err, raw) => {
            if (err) Util.responseHandler(res, false, 'Connection Error', null);
            if (raw.nModified) Util.responseHandler(res, true, 'Success', null);
            else Util.responseHandler(res, false, 'Not removed', null);
        })
})
router.put('/update/:id', (req, res) => {
    var filepath = 'assets/gravatar/' + req.params.id + 'd.jpg';
    var password = createHash(req.body.password);

    var photoData = req.body.photo;
    if (!photoData.includes('http')) {
        uploadPhoto(photoData, filepath);
        filepath = Util.SERVER_URL + filepath;
        req.body.photo = filepath;
    }

    accountModel.update({
            _id: mongoose.Types.ObjectId(req.params.id)
        }, req.body,
        (err, raw) => {
            if (err) res.send({
                success: false,
                message: 'Error'
            });
            else res.send({
                success: true,
                message: 'Updated succesfully'
            });
        });
});
router.delete('/close/:id', (req, res) => {
    accountModel.remove({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err) => {
        console.log(req.params.id);
        if (err) res.send({
            success: false,
            message: 'Error'
        });
        else {
            res.send({
                success: true,
                message: 'Successfully closed the account'
            });
        }
    });
});

function uploadPhoto(data, filepath) {
    data = data.replace(/^data:image\/jpeg;base64,/, "");
    data = data.replace(/^data:image\/png;base64,/, "");
    var imageBuffer = new Buffer(data, 'base64'); //console = <Buffer 75 ab 5a 8a ...
    fs.writeFile('public/' + filepath, imageBuffer, function (err) {
        console.log(err);
        return filepath;
    });
}
// Generates hash using bCrypt
var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

module.exports = router;