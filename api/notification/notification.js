var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var accountSchema = require('../../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
var notificationSchema = require('../../model/notification').notificationSchema;
var notificationModel = mongoose.model('Notification', notificationSchema);
var fs = require('graceful-fs');
var ObjectId = mongoose.Types.ObjectId;
var Util = require('../../lib/util');

router.post('/push', (req, res) => {
    var notification = new notificationModel({
        sender: ObjectId(req.body.sender),
        receiver: ObjectId(req.body.receiver),
        type: req.body.type,
        message: req.body.message,
        read: false,
        new: true,
        sender_firstname: req.body.sender_firstname,
        sender_lastname: req.body.sender_lastname,
        sender_photo: req.body.sender_photo
    });
    notification.save((err, doc, num) => {
        console.log(err, doc, num);
        if (err) Util.responseHandler(res, false, 'Error', null);
        else {
            if (req.body.type == Util.NOTIFICATION_TYPE.ALLOW_SHARE || req.body.type == Util.NOTIFICATION_TYPE.DISALLOW_SHARE) {
                ShareHandler(res, req.body.sender, req.body.receiver, req.body.type);
                return;
            }
            Util.responseHandler(res, true, 'Success', null);
        }
    })
});

router.get('/:id/pull/:filter', (req, res) => {
    var filter;
    if (req.params.filter == 'new')
        filter = {
            receiver: mongoose.Types.ObjectId(req.params.id),
            new: true
        }
    else if (req.params.filter == 'af')
        filter = {
            receiver: mongoose.Types.ObjectId(req.params.id),
            type: 3
        }

    else
        filter = {
            receiver: mongoose.Types.ObjectId(req.params.id)
        }

    notificationModel.find(filter, (err, docs) => {
        if (err) Util.responseHandler(res, false, 'Connection Error', null);
        else {
            if (docs.length != 0) {
                Util.responseHandler(res, true, 'Success', docs);
                var idArray = docs.map((x) => x._id);
            } else {
                Util.responseHandler(res, false, 'No notifications', null);
            }
        }
    });
});
router.get('/:id', (req, res) => {
    notificationModel.findById(req.params.id, (err, doc) => {
        if (err) Util.responseHandler(res, false, 'Connection Error', null);
        else {
            if (docs) {
                Util.responseHandler(res, true, 'Success', doc);
            } else {
                Util.responseHandler(res, false, 'No notifications', null)
            }
        }
    })
})
router.post('/read', (req, res) => {
    if (req.body.delete == true) {
        notificationModel.remove({
            _id: req.body.ids
        }, (err) => {
            console.log(err);
            if (err) Util.responseHandler(res, false, 'Error', null);
            else Util.responseHandler(res, true, 'Success', null);
        });
    } else {
        notificationModel.update({}, {
            $set: {
                new: false
            }
        }, {
            multi: true
        }, (err, raw) => {
            console.log('Pulled', err, raw);
        });
    }
})

function ShareHandler(res, sender, receiver, allow) {
    if (allow == Util.NOTIFICATION_TYPE.ALLOW_SHARE) {
        accountModel.update({
            _id: mongoose.Types.ObjectId(receiver)
        }, {
            $push: {
                shares: mongoose.Types.ObjectId(sender),
                accounts: mongoose.Types.ObjectId(sender)
            }
        }, (err, raw) => {
            if (err) Util.responseHandler(res, false, 'Error', null);
            else {
                if (raw.nModified) Util.responseHandler(res, true, 'Success', null);
                else Util.responseHandler(res, false, 'Not allowed', null);
            }
            console.log(err, raw);
        })
    } else {
        accountModel.update({
            _id: mongoose.Types.ObjectId(receiver)
        }, {
            $pull: {
                shares: mongoose.Types.ObjectId(sender)
            }
        }, (err, raw) => {
            if (err) Util.responseHandler(res, false, 'Error', null);
            else {
                if (raw.nModified) Util.responseHandler(res, true, 'Success', null);
                else Util.responseHandler(res, false, 'Not allowed', null);
            }
            console.log(err, raw);
        })
    }
}


module.exports = router;