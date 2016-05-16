// admin-logs.js
var debug = require('debug')('smalo-server:admin:logs');
var express = require('express');
var db = require('../lib/mysql-connection');
var moment = require('moment');
var config = require('config').database;
var mysql = db.mysql;
var connection = db.connection;

var router = express.Router();
router.get(/^\/logs$/, function(req, res, next){
    var params = {};
    var per_page = 25;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }
    var offset = 0;
    offset = (page - 1) * per_page;
    // ログを取得する。ページあたり25件
    var select_logs = 'SELECT * FROM operation_logs ORDER BY operation_datetime DESC, id DESC LIMIT ?, ?';
    select_logs = mysql.format(select_logs, [offset, per_page]);
    connection.query(select_logs, function(err, results){
        debug('[QUERY] ' + select_logs);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['operationLogs'] = results;
        res.render('admin-logs', params);
    });
});

module.exports = router;
