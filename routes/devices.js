// devices.js
var debug = require('debug')('smalo-server:api:devices');
var express = require('express');
var db = require('../lib/mysql-connection');
var moment = require('moment');
var config = require('config').database;
var Device = require('../device').Device;
var mysql = db.mysql;
var mysqlPool = db.mysqlPool;

var router = express.Router();
router.post(/^\/v1\/devices$/, function(req, res, next){
    var deviceUuid = req.body.uuid;
    var deviceName = req.body.name;
    var isLock = req.body.isLock || false;
    var keyLockCode = isLock ? 'lock' : 'key';
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    var error;

    // バリデーション
    if (deviceUuid === undefined || deviceName === undefined) {
        debug('Validation Error: UUID or Name undefined.');

        error = new Error('validation error: required uuid and name.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }
    if (deviceUuid.length === 0 || deviceUuid.length > 36) {
        debug('Validation Error: UUID length error.');

        error = new Error('validation error: uuid length error.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }
    if (deviceName.length === 0 || deviceName.length > 50) {
        debug('Validation Error: Name length error.');

        error = new Error('validation error: name length error.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }

    // 登録データを確認する。
    var selectDevices = 'SELECT uuid, name, is_registered, is_enabled FROM devices WHERE uuid = ?';
    selectDevices = mysql.format(selectDevices, [deviceUuid]);
    mysqlPool.query(selectDevices, function(err, rows, fields){
        debug('[QUERY] ' + selectDevices);
        if (err) {
            // log.warn('Database Error. Message: %s. Query: "%s".', err.message, selectDevices);
            debug('Database Error. Message: ' + err.message);

            error = new Error('Database error has occurred.');
            error.status = 500;
            error.status_message = 'Internal Server Error';
            return next(error);
        }
        if (rows.length === 0) {
            // データがなければ、INSERT
            // log.debug('Select Device: 0 Row. Query: "%s".', selectDevices);
            debug('Select Device: 0 Row. Query: ' + selectDevices);

            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var insertDevices = 'INSERT INTO devices (uuid, name, key_lock_code, created, updated) VALUES (?, ?, ?, ?, ?)';
            insertDevices = mysql.format(insertDevices, [deviceUuid, deviceName, keyLockCode, now, now]);
            mysqlPool.query(insertDevices, function(err, results){
                debug('[QUERY] ' + insertDevices);
                if (err) {
                    //log.warn('Database Error. Message: %s. Query: "%s".', err.message, insertDevices);
                    debug('Database Error. Message: ' + err.message);

                    error = new Error('Database error has occurred.');
                    error.status = 500;
                    error.status_message = 'Internal Server Error';
                    return next(error);
                }
                Device.emitChange();
                return res.status(204).end();
            });
        }

        if (rows.length === 1) {
            // データが存在しかつ端末名が異なる場合、UPDATE（仮登録状態）にする。
            debug('Select Device: 1 Row. Query: ' + selectDevices);
            if (rows[0].name === deviceName) {
                // log.debug('same device name.');
                debug('Found Same device name!');

                return res.status(204).end();
            }

            // log.debug('change device name.');
            debug('Change device name!');
            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var updateDevices = 'UPDATE devices SET name = ?, key_lock_code = ?, is_registered = ?, is_enabled = ?, updated = ? WHERE uuid = ?';
            updateDevices = mysql.format(updateDevices, [deviceName, keyLockCode, 0, 0, now, deviceUuid]);
            mysqlPool.query(updateDevices, function(err, results){
                debug('[QUERY] ' + updateDevices);
                if (err) {
                    //log.warn('Database Error. Message: %s. Query: "%s".', err.message, updateDevices);
                    debug('Database Error. Message: ' + err.message);

                    error = new Error('Database error has occurred.');
                    error.status = 500;
                    error.status_message = 'Internal Server Error';
                    return next(error);
                }
                Device.emitChange();
                return res.status(204).end();
            });
        }
    });
});

module.exports = router;
