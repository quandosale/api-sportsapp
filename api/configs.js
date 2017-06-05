var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var configSchema = require('../model/identities').configSchema;
var configModel = mongoose.model('Config', configSchema);
var Util = require('../lib/util');

router.get('/', (req, res) => {
    configModel.find((err, docs) => {
        if (err) res.send({
            status: 'error',
            message: 'Unexpected error occured'
        });
        res.send(docs);
    })
});
router.get('/get/:id', (req, res) => {
    configModel.find({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, (err, docs) => {
        if (err || !docs) res.send({
            status: 'error',
            message: 'Unexpected error occured'
        });
        Util.responseHandler(res, true, "success", docs);
    });
});
router.put('/update/:id', (req, res) => {
    configModel.update({
        _id: mongoose.Types.ObjectId(req.params.id)
    }, req.body, (err, raw) => {
        console.log('Update Config', err, raw);
        if (err) Util.responseHandler(res, false, "Error", null);
        else Util.responseHandler(res, true, "success", null);
    })
});

router.post('/add', (req, res) => {
    var newConfig = new configModel();
    newConfig.uploadFreq = req.body.uploadFreq;
    newConfig.pollingFreq = req.body.pollingFreq;
    newConfig.patientId = req.body.patientId;
    newConfig.save((err, product, numberAffected) => {
        if (err) {
            console.log(err);
            res.send({
                status: 'error',
                message: 'Unexpected error occured'
            });
        } else
            res.send({
                status: 'success',
                message: product
            });
    });
});
module.exports = router;