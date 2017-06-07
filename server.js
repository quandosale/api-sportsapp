var logger = require('morgan');
var cors = require('cors');
var http = require('http');
var express = require('express');
var errorhandler = require('errorhandler');
var dotenv = require('dotenv');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./global/config');
var session = require('express-session');
var passport = require('passport');
var path = require('path');
var fs = require('graceful-fs');

// Requrie apis
var authenticate = require('./api/authenticate')(passport);
var patientsHandler = require('./api/patients');
var gatewayHandler = require('./api/gateways');
var deviceHandler = require('./api/devices');
var accountHandler = require('./api/accounts');
var journalHandler = require('./api/phr/journal');
var datasetHandler = require('./api/phr/dataset');
var notificationHanlder = require('./api/notification/notification');
var configsHandler = require('./api/configs');
var firmwareHandler = require('./api/firmware');
var clientHanlder = require('./router.js');

require('./model/identities');

var app = express();

//View Engine
app.set('views', path.join(__dirname, '../../client'));
// app.set('views', path.join(__dirname, '../client-sportsapp/dist'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

// Embed File server
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '../../client')));
// app.use(express.static(path.join(__dirname, '../client-sportsapp/dist')));

dotenv.load();

// Parsers
// old version of line
// app.use(bodyParser.urlencoded());
// new version of line

app.use(session({
  secret: 'keyboard cat',
  proxy: true,
  resave: true,
  saveUninitialized: true
}));
app.use(bodyParser.urlencoded({
  limit: '5mb',
  extended: true
}));
app.use(bodyParser.json({
  limit: '5mb'
}));
app.use(cors());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

app.use(function (err, req, res, next) {
  if (err.name === 'StatusError') {
    res.send(err.status, err.message);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next(err);
  }
});

app.get('/register', (req, res, next) => {
  console.log('signup');
  res.redirect('/');
  return;
});

app.get('/convert', (req, res, next) => {
  var path = 'public/datasets/1.dat';
  if (fs.existsSync(path)) {
    console.log('open');
    var fd = fs.openSync(path, 'r');
    var size = fs.statSync(path)['size'] / 2;
    var bufR = Buffer.allocUnsafe(size);
    var bufW = Buffer.allocUnsafe(parseInt(size * 2 * 16 / 12));
    fs.readSync(fd, bufR, 0, size, 0);
    var indexInBufR = 0;
    var indexInBufW = 0;
    var prevVal = 0;
    for (var i = 0; i < size / 3; i++) {
      var prev = prevVal;

      var part1 = bufR.readInt8(indexInBufR);
      var part2 = bufR.readInt8(indexInBufR + 1);
      var part3 = bufR.readInt8(indexInBufR + 2);

      var first = (part1 & 0xff) + (part2 & 0xf) * 256;
      if (first > 2048) first = first - 4096;

      first = first * 15 + 2048;

      var second = first;
      if (i != 0)
        second = (first + prev) / 2;
      bufW.writeInt16LE(second, indexInBufW);
      bufW.writeInt16LE(first, indexInBufW + 2);
      prevVal = first;
      indexInBufR += 3;
      indexInBufW += 4;

      if (i == 210000)
        break;
    }
    console.log(bufW);
    fs.writeFileSync('public/datasets/out_ecg.dat', bufW);
    fs.closeSync(fd);
  } else {
    console.log('not ex');
  }
  res.send('aaa');
})
// Initialize Passport
var initPassport = require('./passport-init');
initPassport(passport);

if (process.env.NODE_ENV === 'development') {
  app.use(express.logger('dev'));
  app.use(errorhandler());
}

app.use('/auth', authenticate);
app.use('/patients', patientsHandler);
app.use('/gateways', gatewayHandler);
app.use('/devices', deviceHandler);
app.use('/accounts', accountHandler);
app.use('/phr/journals', journalHandler);
app.use('/phr/datasets', datasetHandler);
app.use('/notifications', notificationHanlder);
app.use('/configs', configsHandler);
app.use('/firmware', firmwareHandler);
app.use('/*', clientHanlder);

var port = process.env.PORT || 80;

http.createServer(app).listen(port, function (err) {
  console.log('listening on port:' + port);
});


//  Database Connect
var dbUri = `mongodb://${config.db.username}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.database}`;
mongoose.Promise = global.Promise;

var options = {
  server: {
    socketOptions: {
      keepAlive: 1,
      connectTimeoutMS: 30000
    }
  },
  replset: {
    socketOptions: {
      keepAlive: 1,
      connectTimeoutcdMS: 30000
    }
  }
};

var db = mongoose.connect(dbUri, options);
mongoose.connection.on('open', () => {
  console.log('Database connected...');
})

// Database end