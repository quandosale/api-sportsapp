var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    nev = require('email-verification')(mongoose);
var global = require('../global/config');
var accountSchema = require('../model/identities').accountSchema;
var accountModel = mongoose.model('Account', accountSchema);
var bCrypt = require('bcrypt-nodejs');
var Util = require('../lib/util');
var email_template = require('../public/assets/email-template/template');
var configSchema = require('../model/identities').configSchema;
var configModel = mongoose.model('Config', configSchema);
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
// sync version of hash ing function
var myHasher = function (password, tempUserData, insertTempUser, callback) {
    var hash = bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    return insertTempUser(hash, tempUserData, callback);
};
var errorHandler = function (res, err, msg) {
    console.log('Error', err, msg);
    Util.responseHandler(res, false, msg, null);
}

nev.configure({
    verificationURL: global.server_url + 'auth/email-verification/${URL}',
    persistentUserModel: accountModel,
    tempUserCollection: `tempaccounts`,
    emailFieldName: 'username',
    expirationTime: 600,
    shouldSendConfirmation: false,
    transportOptions: {
        service: 'Gmail',
        auth: {
            user: 'wbitsale@gmail.com',
            pass: 'wbit2017'
        }
    },
    hashingFunction: myHasher,
    verifyMailOptions: {
        from: 'CALM <myawesomeemail_do_not_reply@gmail.com>',
        subject: 'Please confirm account',
        html: email_template('signup'),
        text: 'Please confirm your account by clicking the following link: ${URL}'
    }
}, function (error, options) {
    // console.log(error, options);
});

nev.generateTempUserModel(accountModel, (err, model) => {
    // console.log(err, model);
});

module.exports = function (passport) {
    // SNS signin
    router.post('/sns-signin', (req, res, next) => {
        processSNSAccount(req, res);
    });

    //log in
    router.post('/login', (req, res, next) => {
        passport.authenticate('login', (err, user, info) => {
            if (err) {
                res.status(500).send({
                    success: false,
                    message: 'Server Authentication Error...'
                });
                return next(err);
            }
            if (!user) {
                console.log('aaa');
                res.send({
                    success: false,
                    message: 'Invalid username or password...'
                });
                return next(err);
            }
            req.login(user, loginErr => {
                if (loginErr) {
                    return next(loginErr);
                }
                return res.send({
                    success: true,
                    message: 'Successfully logged in...',
                    data: {
                        user: user
                    }
                });
            });
        })(req, res, next);
    });
    //sign up
    router.post('/signup', (req, res, next) => {

        var height_unit = req.body.height_unit ? req.body.height_unit : 'feet';
        var weight_unit = req.body.weight_unit ? req.body.weight_unit : 'lbs';
        console.log('--------- sign up ----------------');
        console.log(req.body);
        console.log('height unit');
        console.log(height_unit, weight_unit);
        var newUser = accountModel({
            username: req.body.username,
            password: req.body.password,
            firstname: req.body.firstname,
            secondname: req.body.lastname,
            sec_question: req.body.sec_question,
            sec_answer: req.body.sec_answer,
            gender: req.body.gender,
            birthday: new Date(req.body.birthday),
            height: req.body.height,
            height_unit: height_unit,
            weight: req.body.weight,
            weight_unit: weight_unit,
            type: '',
            photo: '/assets/gravatar/default.jpg',
            config: null,
            patients: [],
            gateways: [],
            accounts: [],
            datasets: [],
            shares: [],
            level: 0,
            size_of_storage: 0
        });
        nev.createTempUser(newUser, function (err, existingPersistentUser, newTempUser) {
            // some sort of error
            if (err) {
                errorHandler(res, err, "Unexpected error while creating temp user");
                return;
            }

            // user already exists in persistent collection...
            if (existingPersistentUser) {
                console.log("Account already exists", existingPersistentUser);
                Util.responseHandler(res, false, "Account already exists", null);
                return;
            }

            // a new user
            if (newTempUser) {
                var URL = newTempUser[nev.options.URLFieldName];
                nev.sendVerificationEmail(req.body.username, URL, function (err, info) {
                    if (err) {
                        errorHandler(res, err, "Unexpected Error while sending verification email");
                        return;
                    } else {
                        console.log("Verification email sent");
                        Util.responseHandler(res, true, "Verification email has sent to your email address. Please check out your email inbox.", null);
                        return;
                    }
                });

                // user already exists in temporary collection...
            } else {
                console.log('Resending verification email');
                nev.resendVerificationEmail(req.body.username, function (err, success) {
                    console.log('resendVerificationEmail', URL, err, success);
                    if (err) {
                        errorHandler(res, err, "Unexpected Error while resending verification email");
                        return;
                    } else {
                        console.log("Verification email resent");
                        Util.responseHandler(res, true, "Verification email has resent to your email address. Please check out your email inbox.", null);
                        return;
                    }
                });
                return;
            }
        });
    });
    // user accesses the link that is sent
    router.get('/email-verification/:URL', function (req, res) {
        var url = req.params.URL;

        nev.confirmTempUser(url, function (err, user) {
            console.log('confirmTempUser', err, user);
            if (user) {
                if (err) {
                    errorHandler(res, err, "Error while confirming user");
                    return;
                }
                var config = new configModel({
                    region: null,
                    language: null,
                    newsletter: null,
                    units: null,
                    subscription: null,
                    upload_freq: 10,
                    polling_freq: 10,
                    login_everytime: true
                });
                console.log(user, 'Email-verified');
                config.save((err, doc, num) => {
                    if (!err) {
                        accountModel.findByIdAndUpdate(user._id, {
                            config: mongoose.Types.ObjectId(doc._id)
                        }, (err, doc) => console.log(err, doc));
                    }
                })
                res.redirect('/');
            } else {
                res.redirect('/');
            }
        });
    });

    router.post('/forgot-password', (req, res, next) => {
        async.waterfall([
            function (done) {
                crypto.randomBytes(20, function (err, buf) {
                    var token = buf.toString('hex');
                    done(err, token);
                });
            },
            function (token, done) {
                console.log(req.body);
                accountModel.findOne({
                    username: req.body.username,
                    sec_question: req.body.sec_question,
                    sec_answer: req.body.sec_answer
                }, function (err, user) {
                    if (!user) {
                        Util.responseHandler(res, false, "No account with that email address exists or invalid answer", null);
                        return;
                    }
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                    user.save().then((doc) => {
                        console.log(doc, 'forgot password');
                        done(null, token, doc);
                    })
                });
            },
            function (token, user, done) {
                var smtpTransport = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // use SSL
                    auth: {
                        user: 'wbitsale@gmail.com',
                        pass: 'wbit2017'
                    }
                });

                var mailOptions = {
                    from: 'CALM <wbitsale@gmail.com>',
                    to: user.username,
                    subject: 'Password reset request',
                    html: email_template('reset-password', {
                        host: req.headers.host,
                        token: token
                    })
                };
                smtpTransport.sendMail(mailOptions, function (err, info) {
                    // console.log('sendMail', err, info);
                    if (!err)
                        Util.responseHandler(res, true, "Email has sent to your address. \nPlease checkout your mailbox.")
                    done(err, 'done');
                });
            }
        ], function (err) {
            if (err) return next(err);
            // res.redirect('/');
        });
    });

    router.get('/reset-password/:token', (req, res, next) => {
        res.render('index.html');
    });

    router.post('/reset-password/:token', (req, res) => {
        async.waterfall([
            function (done) {
                accountModel.findOne({
                    resetPasswordToken: req.params.token,
                    resetPasswordExpires: {
                        $gt: Date.now()
                    }
                }, function (err, user) {
                    if (!user) {
                        Util.responseHandler(res, false, "Unexpected error while resetting password", null);
                        // return res.redirect('/');
                    }
                    console.log('reset password', req.body.password);
                    user.password = createHash(req.body.password);
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
                    user.save(function (err) {
                        req.logIn(user, function (err) {
                            console.log(err, user);
                            done(err, user);
                        });
                    });
                });
            }
        ], function (err) {
            if (err) return next(err);
            // res.redirect('/');
        });
    });

    var createHash = function (password) {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    };
    return router;
}

function processSNSAccount(req, res) {
    accountModel.find({
        snsId: req.body.snsId
    }, (err, doc) => {
        if (err || !doc) {
            console.log('find error', err);
            Util.responseHandler(res, false);
            return;
        } else {
            if (doc.length != 0) {
                res.send({
                    success: true,
                    message: 'Successfully logged in...',
                    data: {
                        user: doc[0]
                    }
                });
            } else {
                accountModel.find({
                    username: req.body.username
                }, (err, doc) => {
                    if (err || !doc) {
                        Util.responseHandler(res, false);
                        return;
                    } else {
                        if (doc.length != 0) {
                            Util.responseHandler(res, false, "Already exist email", null);
                            return;
                        } else {
                            // if new account
                            let accountData = {
                                snsId: req.body.snsId,
                                username: req.body.username,
                                password: 'tet',
                                firstname: req.body.firstname,
                                secondname: req.body.secondname,
                                sec_question: 'question',
                                sec_answer: 'a',
                                gender: '',
                                birthday: new Date(),
                                height: 0,
                                weight: 0,
                                type: '',
                                photo: req.body.photo,
                                config: null,
                                gateways: [],
                                level: 0,
                                size_of_storage: 0
                            }
                            accountModel.insertMany(accountData, (err, doc) => {
                                if (err) {
                                    Util.responseHandler(res, false, "Add user fail", err);
                                }
                                if (doc.length > 0) {
                                    res.send({
                                        success: true,
                                        message: 'Successfully logged in...',
                                        data: {
                                            user: doc[0]
                                        }
                                    });
                                }
                            });
                        }
                    }
                });

            }
        }
    });
}