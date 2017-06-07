var express = require('express');
var router = express.Router();
var multer = require('multer');
var fs = require('graceful-fs');
var Util = require('../lib/util');

var DIR = 'public/firmware';

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, DIR)
    },
    filename: function (req, file, cb) {
        cb(null, '' + Date.now())
    }
})


var upload = multer({
    storage: storage
}).any();

// router.use(upload);

router.get('/download/:filename', (req, res) => {
    var filename = 'public/datasets/' + req.params.filename;
    res.download(filename);
});


router.get('/upload', function (req, res) {
    console.log(req.body);
    res.end('file catcher example');
});

router.post('/upload', function (req, res) {
    fs.readdir(DIR, (err, files) => {
        files.forEach(file => {
            console.log(file);
            fs.unlinkSync(DIR + '/' + file);
        });
    })

    upload(req, res, function (err) {
        if (err) {
            return res.end(err.toString());
        }

        res.end('File is uploaded');
    });
});

module.exports = router;