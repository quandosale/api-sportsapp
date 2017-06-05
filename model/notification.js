var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var ObjectID = mongoose.SchemaTypes.ObjectId;

var notificationSchema = new mongoose.Schema({
    sender: ObjectID,
    receiver: ObjectID,
    type: Number,
    message: String,
    sender_firstname: String,
    sender_lastname: String,
    sender_photo: String,
    read: Boolean,
    new: Boolean
});

mongoose.model('Notification', notificationSchema);

module.exports = {
    notificationSchema: notificationSchema
}