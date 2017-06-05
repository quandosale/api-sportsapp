var mongoose = require('mongoose');
var notificationSchema = require('../../model/notification').notificationSchema;
var notificationModel = mongoose.model('Notification', notificationSchema);
var ObjectId = mongoose.Types.ObjectId;

function pushNotification(sender, receiver, type, message, sender_firstname, sender_lastname, sender_photo) {
    var notification = new notificationModel({
        sender: ObjectId(sender),
        receiver: ObjectId(receiver),
        type: type,
        message: message,
        read: false,
        new: true,
        sender_firstname: sender_firstname,
        sender_lastname: sender_lastname,
        sender_photo: sender_photo
    });
    notification.save((err, doc, num) => {
        if (err) {
            // console.log('error while save notification');
            return false;
        } else {
            if (type == 3) {
                // ShareHandler(res, sender, receiver, type);
                // console.log('Success save notification');
                return;
            }
            return true;
        }
    });
}

module.exports = {
    pushNotification: pushNotification,

}