// admin-devices.js
var debug = require('debug')('smalo-server:admin:devices');
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
router.get(/^\/devices\/non_registered$/, function(req, res, next){
    var params = {};
    var per_page = 25;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }
    var offset = 0;
    offset = (page - 1) * per_page;
    // 仮登録のデバイスを取得する。ページあたり25件
    var select_devices = 'SELECT * FROM devices WHERE is_registered = 0 ORDER BY created DESC, uuid LIMIT ?, ?';
    select_devices = mysql.format(select_devices, [offset, per_page]);
    connection.query(select_devices, function(err, results){
        debug('[QUERY] ' + select_devices);
	console.log(results);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['devices'] = results;
        res.render('admin-devices', params);
    });
});


router.get(/^\/devices$/, function(req, res, next){
    var params = {};
    var per_page = 25;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }
    var offset = 0;
    offset = (page - 1) * per_page;
    // デバイスを取得する。ページあたり25件
    var select_devices = 'SELECT * FROM devices ORDER BY created DESC, uuid LIMIT ?, ?';
    select_devices = mysql.format(select_devices, [offset, per_page]);
    connection.query(select_devices, function(err, results){
        debug('[QUERY] ' + select_devices);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['devices'] = results;
        res.render('admin-devices', params);
    });
});

module.exports = router;
