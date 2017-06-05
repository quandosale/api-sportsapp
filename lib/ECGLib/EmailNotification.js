var async = require('async');
var mongoose = require('mongoose');
var accountSchema = require('../../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
var configSchema = require('../../model/identities').configSchema;
var configModel = mongoose.model('Config', configSchema);
var nodemailer = require('nodemailer');
var email_template_af = require('../../public/assets/email-template/template');

var global = require('../../global/config');

function sendMail(sender, receiver, type, message, sender_firstname, sender_lastname, sender_photo, _date, _timeStr, _dataset) {
    async.waterfall([
        function (done) {
            accountModel.findOne({
                _id: mongoose.Types.ObjectId(receiver),
            }, function (err, user) {
                if (err) {
                    console.log('error');
                } else if (user) {

                    done(null, message, user);
                }
            });
        },
        function (_token, user, done) {

            configModel.findOne({
                _id: mongoose.Types.ObjectId(user.config)
            }, (err, doc) => {
                if (err || !doc) {
                    console.log('config error', err);
                    return;
                } else {
                    if (doc) {
                        // console.log('email notification config: ', doc.af_notification)
                        if (doc.af_notification) {
                            done(null, message, user);
                        }
                    }
                }
            });

        },
        function (_token, user, done) {

            var smtpTransport = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true, // use SSL
                auth: {
                    user: 'wbitsale@gmail.com',
                    pass: 'wbit2017'
                }
            });
            var doctorName = user.secondname;
            var patientName = sender_firstname + " " + sender_lastname;
            if (_dataset == null || _dataset == undefined) {
                done("error");
                return;
            }
            var datasetId = _dataset._id;

            var date = dateFormat(_date);
            // var host = "52.33.117.221";
            var host = global.server_url;
            if (host == undefined) {
                host = "52.33.117.221";
            }

            var mailOptions = {
                from: 'CALM <wbitsale@gmail.com>',
                to: user.username,
                subject: 'Atrial fibrillation Report',
                html: email_template_af('af-report', {
                    host: host,
                    token: _token,
                    doctor: doctorName,
                    patient: patientName,
                    dataset: datasetId,
                    date: date,
                    patientPhoto: sender_photo

                })
            };
            smtpTransport.sendMail(mailOptions, function (err, info) {
                if (!err)
                    // Util.responseHandler(res, true, "Email has sent to your address. \nPlease checkout your mailbox.")
                    done(err, 'done');
            });
        }
    ], function (err) {
        if (err) console.log('err if end', err);
        // res.redirect('/');
    });
}
module.exports = {
    sendMail: sendMail
}
// convert date to Formatted String
function dateFormat(date) {
    var dateTime = new Date(date);
    var yyyy = dateTime.getFullYear();
    var month = dateTime.getMonth() + 1;
    var mm = (month / 10 >= 1) ? month : ('0' + month);
    var day = dateTime.getDate();
    var dd = (day / 10 >= 1) ? day : ('0' + day);

    var hour = dateTime.getHours();
    var hh = (hour / 10 >= 1) ? hour : ('0' + hour);
    var minute = dateTime.getMinutes();
    var min = (minute / 10 >= 1) ? minute : ('0' + minute);
    var second = dateTime.getSeconds();
    var ss = (second / 10 >= 1) ? second : ('0' + second);

    var result = `${mm}%2F${dd}%2F${yyyy}%20${hh}%3A${min}%3A${ss}`;

    return result;
}
// var sender = patient._id; //patient
// var receiver = patient.doctor.id; //doctor
// var type = 3; // af notification
// var date;
// if (_dataset != null)
//     date = new Date(_dataset.datetime);
// else date = new Date();

// var nowDate = new Date();
// var dateStr = this.dateFormat(date);
// var message = "";
// if (_dataset != null)
//     message = "Atrial fibrillation  is detected at " + dateStr + ",  " +
//     "analysed at " + this.dateFormat(nowDate);
// else message = "Atrial fibrillation  is detected at " + dateStr;
// var sender_firstname = patient.firstname; //patient name
// var sender_lastname = patient.lastname; // patient name
// var sender_photo = patient.photo; //patient photo