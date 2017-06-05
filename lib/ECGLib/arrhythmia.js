var fs = require('graceful-fs');
var request = require("request");
var HR_Handler = require('../heartrate');
var FileWrite = require('./FileWrite');
var NotifiUtil = require('../../api/notification/noti-util');
var EmailNotification = require('./EmailNotification');
var async = require('async');

function saveAF(res, filename, ecg, bAppend, _patient, _duration, _dataset, _isSaveHrt, _isEnd) {
    var position = 0;
    var AF_total_number = 0;
    var MAX_PACKET_NUMBER = 200000;

    async.whilst(
        function () {
            return ecg.length > 0;
        },
        function (callback) {
            var sendEcg = ecg.slice(0, MAX_PACKET_NUMBER);
            ecg = ecg.slice(MAX_PACKET_NUMBER);

            var url = 'https://a4nc4fz9yj.execute-api.ap-northeast-1.amazonaws.com/prov';
            // var url = "http://192.168.3.4:3002/phr/datasets/monitor-lambda-analysis";

            request.post(url, {
                    json: {
                        ecg: sendEcg,
                        position: position
                    }
                },
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var afResult = body.AF;
                        var hrResult = body.Hr;
                        var pos = body.position;
                        if (hrResult) {
                            var is_HR_Append = pos != 0;
                            HR_Handler.saveHR(`${filename}_hr.dat`, hrResult, _patient, _duration, is_HR_Append);
                        }
                        if (afResult != undefined) {
                            AF_total_number += afResult.length;
                            afResult.map((af, index) => {
                                var is_Af_Append = !(pos == 0 && index == 0);
                                FileWrite.afDataSaveToFile(filename, af.s, af.e, is_Af_Append);
                            });
                        }

                        callback(null, AF_total_number);
                    } else {
                        callback(body);
                    }
                });
            position += sendEcg.length;
        },
        function (err, _AF_number) {
            console.log('total af number', _AF_number);
            if (err) {
                console.log('err', err);
                if (_isEnd) {
                    res.send({
                        success: false,
                        message: 'Fail for analysis',
                        data: err
                    });
                }
                return;
            }
            if (_isEnd) {
                if (_AF_number > 0) {
                    var sender = _patient._id; //patient
                    var receiver = _patient.doctor.id; //doctor
                    var type = 3; // af notification
                    var date;
                    if (_dataset != null)
                        date = new Date(_dataset.datetime);
                    else date = new Date();

                    var nowDate = new Date();
                    var dateStr = dateFormat(date);
                    var message = "";
                    if (_dataset != null)
                        message = "Atrial fibrillation  is detected at " + dateStr + ",  " +
                        "analysed at " + dateFormat(nowDate);
                    else message = "Atrial fibrillation  is detected at " + dateStr;
                    var sender_firstname = _patient.firstname; // patient name
                    var sender_lastname = _patient.lastname; // patient name
                    var sender_photo = _patient.photo; // patient photo
                    NotifiUtil.pushNotification(sender, receiver, type, message, sender_firstname, sender_lastname, sender_photo);
                    EmailNotification.sendMail(sender, receiver, type, message, sender_firstname, sender_lastname, sender_photo, date, dateStr, _dataset);
                }

                res.send({
                    success: true,
                    message: 'Success for analysis',
                    data: null
                });
            }
        });
}

function readAF(filename, position, length, bOne) {
    filename = filename + '_af.dat';
    var AFs = [];
    if (fs.existsSync(filename)) {
        var data = fs.readFileSync(filename, 'utf8');
        // var sets = data.replace(new RegExp(escapeRegExp("\""), 'g'), '').split('\n').map(x => {
        //     return x.split(',').map(e => parseInt(e));
        // });                                                      data structure changed
        var sets = data.split('\n').map(x => {
            return x.split(',').map(e => parseInt(e));
        });

        if (sets.length == 0) return null;
        if (!bOne)
            for (var i = 0; i < sets.length; i++) {
                var start = position;
                var end = position + length;
                if ((start >= sets[i][0] && start <= sets[i][1]) || (end >= sets[i][0] && end <= sets[i][1]) || (start <= sets[i][0] && end >= sets[i][1])) {
                    AFs.push({
                        start: sets[i][0],
                        end: sets[i][1]
                    });
                }
            }
        else
            for (var i = 0; i < sets.length; i++) {
                AFs.push({
                    start: sets[i][0]
                });
            }

        if (AFs.length == 0) return null;
        return AFs;
    } else {
        // console.log('af not exisit');
        return null;
    }
}

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

    var result = `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
    return result;
}
// function escapeRegExp(str) {
//     return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
// }

module.exports = {
    readAF: readAF,
    saveAF: saveAF
}