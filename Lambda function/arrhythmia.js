var AlgoProcess = require('./ECGLib/AlgoProcess');

function analysis(event, context, callback) {
    var ecg = event.ecg;
    var pos = event.position;

    var algoProcess = new AlgoProcess();
    console.log('==============', ecg.length);

    for (var i = 0; i < ecg.length; i++) {
        var isEnd = (i == ecg.length - 1);
        algoProcess.AlgoProcess(ecg[i], pos + i, isEnd, pos, callback);
    }
    if (typeof callback == "function") {
        callback(null, {
            "KKK": "KKK ok"
        });

    }
}
module.exports = {
    analysis: analysis,
}