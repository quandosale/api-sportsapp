var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var ObjectID = mongoose.SchemaTypes.ObjectId;

var datasetSchema = new mongoose.Schema({
    datetime: Date,
    type: String,
    ownerId: ObjectID,
    ownerName: String,
    data: Object,
    comment: Array,
    duration: Number,
});

mongoose.model('Dataset', datasetSchema);

module.exports = {
    datasetSchema: datasetSchema
}