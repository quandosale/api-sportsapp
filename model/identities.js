var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var ObjectID = mongoose.SchemaTypes.ObjectId;

var accountSchema = new mongoose.Schema({
    username: String,
    password: String,
    firstname: String,
    secondname: String,
    gender: String,
    birthday: Date,
    height: Number,
    height_unit: String,
    weight: Number,
    weight_unit: String,
    snsId: String,
    sec_question: String,
    sec_answer: String,
    type: String,
    photo: String,
    config: ObjectID,
    patients: Array,
    gateways: Array,
    devices: Array,
    accounts: Array,
    shares: Array,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    created_at: {
        type: Date,
        default: Date.now
    },
    level: Number,
    size_of_storage: Number,
    datasets: Array,
    alarmSound: String
});
var LevelConfig = {
    level: {
        PERSONAL: 0,
        DOCTOR: 1,
        DOCTOR_PLUS: 2,
        RESEARCHER: 3
    },
    value: [{
            numberOfPatient: 1,
            // sizeOfStorage: 40000
            sizeOfStorage: 5 * 1024 * 1024 * 1024

        },
        {
            numberOfPatient: 10,
            sizeOfStorage: 10 * 1024 * 1024 * 1024
        },
        {
            numberOfPatient: 30,
            sizeOfStorage: 50 * 1024 * 1024 * 1024
        },
        {
            numberOfPatient: 99999,
            sizeOfStorage: 100 * 1024 * 1024 * 1024
        },
    ]
};

var configSchema = new mongoose.Schema({
    region: String,
    language: String,
    newsletter: Boolean,
    units: String,
    subscription: Boolean,
    upload_freq: Number,
    polling_freq: Number,
    login_everytime: Boolean,
    af_notification: Boolean,
    email_notification: Boolean,
    share_notification: Boolean
});

var gatewaySchema = new mongoose.Schema({
    name: String,
    type: String,
    mac: String,
    upload_freq: {
        type: Number,
        default: 10
    },
    polling_freq: Number,
    login_everytime: Boolean,
    owner: ObjectID,
    lastname: String,
    deactivate: Boolean
});

var deviceSchema = new mongoose.Schema({
    ownerId: ObjectID,
    ownerName: String,
    name: String,
    mac: String,
    type: String,
    gateway: String
});
var patientSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    birthday: {
        type: Date,
        default: Date.now
    },
    height: Number,
    gender: String,
    location: String,
    city: String,
    photo: String,
    journals: Array,
    datasets: Array,
    gateways: Array,
    phone: String,
    doctor: {
        id: ObjectID,
        lastname: String
    }
});

accountSchema.plugin(findOrCreate);
deviceSchema.plugin(findOrCreate);
patientSchema.plugin(findOrCreate);
configSchema.plugin(findOrCreate);
gatewaySchema.plugin(findOrCreate);


mongoose.model('Account', accountSchema);
mongoose.model('Device', deviceSchema);
mongoose.model('Patient', patientSchema);
mongoose.model('Config', configSchema);
mongoose.model('Gateway', gatewaySchema);

module.exports = {
    accountSchema: accountSchema,
    deviceSchema: deviceSchema,
    configSchema: configSchema,
    patientSchema: patientSchema,
    gatewaySchema: gatewaySchema,
    LevelConfig: LevelConfig
};