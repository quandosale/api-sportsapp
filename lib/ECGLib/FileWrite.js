var fs = require('graceful-fs');

function afDataSaveToFile(filename, start, end, bAppend) {
    // console.log('affDataSaveToFile', start, end);
    var af_filename = `${filename}_af.dat`;
    if (bAppend) {
        if (fs.existsSync(af_filename)) {
            fs.appendFileSync(af_filename, start + "," + end + '\n');
        } else {
            fs.writeFileSync(af_filename, start + "," + end + '\n');
        }
    } else {
        fs.writeFileSync(af_filename, start + "," + end + '\n');
    }
}

module.exports = {
    afDataSaveToFile: afDataSaveToFile
}