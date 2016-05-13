// admin-home.js
var debug = require('debug')('smalo-server:admin:logs');
var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
// TODO: mysqlへの接続情報は、configで管理するように。
var connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    database: 'smalo_db',
    user: 'smalo',
    password: 'RoMV35ZMQKKLQa8i',
    dateStrings: true
});

var router = express.Router();
router.get(/^\/$/, function(req, res, next){
    res.render('admin-home');
});

module.exports = router;
