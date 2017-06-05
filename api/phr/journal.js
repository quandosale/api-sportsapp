var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var journalSchema = require('../../model/phr').journalSchema;
var journalModel = mongoose.model('Journal', journalSchema);
var patientSchema = require('../../model/identities').patientSchema;
var patientModel = mongoose.model('Patient', patientSchema);

router.post('/add', (req, res) => {

    journalModel.insertMany([req.body], (err, docs) => {
        console.log(err, docs);
        if(err) res.send({ successs: false, message: 'Error', data: null });
        else {
            res.send({success: true, message: 'Success', data: docs[0]});
            patientModel.update({ _id: mongoose.Types.ObjectId(req.body.patientId) }, { $push: { journals: mongoose.Types.ObjectId(docs[0]._id) }  }, 
                (err, raw) => {
            });
        }
    })
});

module.exports = router;