var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var ObjectID = mongoose.SchemaTypes.ObjectId;

var journalSchema = new mongoose.Schema({
    timeImported: Date,
    timeSampled: Date,
    type: String,
    value: String,
    confidence: Number,
    source: String,
    code: Number,
    patientId: ObjectID
});

var datasetSchema = new mongoose.Schema({
    datetime: Date,
    type: String,
    ownerId: ObjectID,
    ownerName: String,
    data: Object,
    comment: Array
});

mongoose.model('Journal', journalSchema);
mongoose.model('Dataset', datasetSchema);

module.exports = {
    journalSchema: journalSchema,
    datasetSchema: datasetSchema
}