// devices.js
var debug = require('debug')('smalo-server:api:devices');
var express = require('express');
var db = require('../lib/mysql-connection');
var moment = require('moment');
var config = require('config').database;
var Device = require('../device').Device;
var mysql = db.mysql;
var connection = db.connection;

var router = express.Router();
router.post(/^\/v1\/devices$/, function(req, res, next){
    var device_uuid = req.body.uuid;
    var device_name = req.body.name;
    var now = moment().format('YYYY-MM-DD HH:mm:ss');
    var error;

    // バリデーション
    if (device_uuid === undefined || device_name === undefined) {
        debug('Validation Error: UUID or Name undefined.');

        error = new Error('validation error: required uuid and name.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }
    if (device_uuid.length === 0 || device_uuid.length > 36) {
        debug('Validation Error: UUID length error.');

        error = new Error('validation error: uuid length error.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }
    if (device_name.length === 0 || device_name.length > 50) {
        debug('Validation Error: Name length error.');

        error = new Error('validation error: name length error.');
        error.status = 400;
        error.status_message = 'Bad Request';
        return next(error);
    }

    // 登録データを確認する。
    var select_devices = 'SELECT uuid, name, is_registered, is_enabled FROM devices WHERE uuid = ?';
    select_devices = mysql.format(select_devices, [device_uuid]);
    connection.query(select_devices, function(err, rows, fields){
        debug('[QUERY] ' + select_devices);
        if (err) {
            // log.warn('Database Error. Message: %s. Query: "%s".', err.message, select_devices);
            debug('Database Error. Message: ' + err.message);

            error = new Error('Database error has occurred.');
            error.status = 500;
            error.status_message = 'Internal Server Error';
            return next(error);
        }
        if (rows.length === 0) {
            // データがなければ、INSERT
            // log.debug('Select Device: 0 Row. Query: "%s".', select_devices);
            debug('Select Device: 0 Row. Query: ' + select_devices);

            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var insert_devices = 'INSERT INTO devices (uuid, name, key_lock_code, created, updated) VALUES (?, ?, ?, ?, ?)';
            insert_devices = mysql.format(insert_devices, [device_uuid, device_name, 'key', now, now]);
            connection.query(insert_devices, function(err, results){
                debug('[QUERY] ' + insert_devices);
                if (err) {
                    //log.warn('Database Error. Message: %s. Query: "%s".', err.message, insert_devices);
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
            debug('Select Device: 1 Row. Query: ' + select_devices);
            if (rows[0].name === device_name) {
                // log.debug('same device name.');
                debug('Found Same device name!');

                return res.status(204).end();
            }

            // log.debug('change device name.');
            debug('Change device name!');
            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var update_devices = 'UPDATE devices SET name = ?, is_registered = ?, is_enabled = ?, updated = ? WHERE uuid = ?';
            update_devices = mysql.format(update_devices, [device_name, 0, 0, now, device_uuid]);
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
                Device.emitChange();
                return res.status(204).end();
            });
        }
    });
});

module.exports = router;
