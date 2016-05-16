// admin-login.js
var debug = require('debug')('smalo-server:admin:login');
var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
var crypto = require('crypto');
var config = require('config').database;
var connection = mysql.createConnection(config);

var router = express.Router();
router.get(/^\/$/, function(req, res, next){
    res.redirect('/admin/login');
});

router.get(/^\/login$/, function(req, res, next){
    res.render('admin-login');
});

router.post(/^\/login$/, function(req, res, next){
    if (req.body.account == undefined || req.body.account.length == 0) {
        // エラー
        return res.redirect('/admin/login');//req.session.user = '1111111112222222';
    }
    if (req.body.password == undefined || req.body.password.length == 0) {
        // エラー
        return res.redirect('/admin/login');
    }
    var account = req.body.account;
    var hashed_password = crypto.createHash('sha256').update(req.body.password).digest('hex');
    var select_admin_accounts = 'SELECT * FROM admin_accounts WHERE is_enabled = 1 AND account_id = ? AND hashed_password = ?';
    select_admin_accounts = mysql.format(select_admin_accounts, [account, hashed_password]);
    connection.query(select_admin_accounts, function(err, results){
        debug('[QUERY] ' + select_admin_accounts);
        console.log(results);
        console.log(results.length);
        if (err) {
            return res.render('admin-login', {error: "DB error."});
        }
        if (results.length !== 1) {
            return res.render('admin-login', {error: "No Account."});
        }
        req.session.user = 'hhhh';
        return res.redirect('/admin/logs');
    });
});

module.exports = router;
