// admin-devices.js
var debug = require('debug')('smalo-server:admin:devices');
var express = require('express');
var db = require('../lib/mysql-connection');
var moment = require('moment');
var config = require('config').database;
var Device = require('../device').Device;
var mysql = db.mysql;
var connection = db.connection;
var router = express.Router();

// 1ページあたりの表示件数
var default_per_page = 25;

// 仮登録の端末一覧を取得・表示する。
router.get(/^\/devices\/non_registered$/, function(req, res, next){
    var params = {};
    var per_page = default_per_page;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }

    var count_devices = 'SELECT COUNT(*) AS cnt FROM devices WHERE is_registered = 0';
    connection.query(count_devices, function(err, results){
        debug('[QUERY] ' + count_devices);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['totalPage'] = Math.ceil(results[0].cnt / per_page);
        params['page'] = page;
        debug('[TotalPageNo] ' + params['totalPage']);

        var offset = (page - 1) * per_page;
        // 仮登録のデバイスを取得する。ページあたり25件
        var select_devices = 'SELECT * FROM devices WHERE is_registered = 0 ORDER BY created DESC, uuid LIMIT ?, ?';
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
});


// 登録されている端末一覧を取得・表示する。
router.get(/^\/devices\/all$/, function(req, res, next){
    var params = {};
    var per_page = default_per_page;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }

    var count_devices = 'SELECT COUNT(*) AS cnt FROM devices';
    connection.query(count_devices, function(err, results){
        debug('[QUERY] ' + count_devices);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['totalPage'] = Math.ceil(results[0].cnt / per_page);
        params['page'] = page;
        debug('[TotalPageNo] ' + params['totalPage']);

        var offset = (page - 1) * per_page;
        // 全デバイスを取得する。ページあたり25件
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
});


// 有効な端末一覧を取得・表示する。
router.get([/^\/devices$/, /^\/devices\/enabled$/], function(req, res, next){
    var params = {};
    var per_page = default_per_page;
    var page = 1;
    var query = req.query;
    if (query.page !== undefined && query.page != 0) {
        page = parseInt(query.page);
    }

    var count_devices = 'SELECT COUNT(*) AS cnt FROM devices WHERE is_enabled = 1';
    connection.query(count_devices, function(err, results){
        debug('[QUERY] ' + count_devices);
        if (err) {
            return next(new Error('erroooooooooooooooooooor'));
        }
        params['totalPage'] = Math.ceil(results[0].cnt / per_page);
        params['page'] = page;
        debug('[TotalPageNo] ' + params['totalPage']);

        var offset = (page - 1) * per_page;
        // 有効なデバイスを取得する。ページあたり25件
        var select_devices = 'SELECT * FROM devices WHERE is_enabled = 1 ORDER BY created DESC, uuid LIMIT ?, ?';
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
});



// 端末本登録
router.post(/^\/devices\/(?:([-\w]+))\/registered$/, function(req, res, next){
    var device_uuid = req.params[0];
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    var error;

    var update_devices = 'UPDATE devices SET is_registered = 1, is_enabled = 1, updated = ? WHERE uuid = ?';
    update_devices = mysql.format(update_devices, [now, device_uuid]);
    connection.query(update_devices, function(err, results){
        debug('[QUERY] ' + update_devices);
        if (err) {
            //log.warn('Database Error. Message: %s. Query: "%s".', err.message, update_devices);
            debug('Database Error. Message: ' + err.message);

            error = new Error('Database error has occurred.');
            error.status = 500;
            error.status_message = 'Internal Server Error';
            return next(error);
        }
    });
    Device.emitChange();
    return res.status(204).end();
});

// 端末有効化
router.post(/^\/devices\/(?:([-\w]+))\/enabled$/, function(req, res, next){
    var device_uuid = req.params[0];
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    var error;

    var update_devices = 'UPDATE devices SET is_enabled = 1, updated = ? WHERE uuid = ?';
    update_devices = mysql.format(update_devices, [now, device_uuid]);
    connection.query(update_devices, function(err, results){
        debug('[QUERY] ' + update_devices);
        if (err) {
            //log.warn('Database Error. Message: %s. Query: "%s".', err.message, update_devices);
            debug('Database Error. Message: ' + err.message);

            error = new Error('Database error has occurred.');
            error.status = 500;
            error.status_message = 'Internal Server Error';
            return next(error);
        }
    });
    Device.emitChange();
    return res.status(204).end();
});

// 端末無効化
router.post(/^\/devices\/(?:([-\w]+))\/disabled$/, function(req, res, next){
    var device_uuid = req.params[0];
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    var error;

    var update_devices = 'UPDATE devices SET is_enabled = 0, updated = ? WHERE uuid = ?';
    update_devices = mysql.format(update_devices, [now, device_uuid]);
    connection.query(update_devices, function(err, results){
        debug('[QUERY] ' + update_devices);
        if (err) {
            //log.warn('Database Error. Message: %s. Query: "%s".', err.message, update_devices);
            debug('Database Error. Message: ' + err.message);

            error = new Error('Database error has occurred.');
            error.status = 500;
            error.status_message = 'Internal Server Error';
            return next(error);
        }
    });
    Device.emitChange();
    return res.status(204).end();
});

module.exports = router;
