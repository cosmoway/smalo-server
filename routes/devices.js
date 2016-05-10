// devices.js
// TODO: ログ出力やメッセージを調整・変更する。
var debug = require('debug')('smalo-server:api');
var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
// TODO: mysqlへの接続情報は、configで管理するように。
var connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    database: 'smalo_db',
    user: 'smalo',
    password: 'RoMV35ZMQKKLQa8i'
});

var router = express.Router();
router.post(/^\/v1\/devices$/, function(req, res, next){
    var device_uuid = req.body.uuid;
    var device_name = req.body.name;
    var now = moment().format('YYYY-MM-DD HH:mm:ss');

    // バリデーション
    if (device_uuid === undefined || device_name === undefined) {
        return next(new Error('invalid data1'));
    }
    if (device_uuid.length === 0 || device_uuid.length > 36) {
        return next(new Error('invalid data2'));
    }
    if (device_name.length === 0 || device_name.length > 50) {
        return next(new Error('invalid data3'));
    }

    // 登録データを確認する。
    var select_devices = 'SELECT uuid, name, is_registered, is_enabled FROM devices WHERE uuid = ?';
    select_devices = mysql.format(select_devices, [device_uuid]);
    connection.query(select_devices, function(err, rows, fields){
        if (err) {
            return next(new Error('database error.'));
        }
        if (rows.length === 0) {
            // データがなければ、INSERT
            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var insert_devices = 'INSERT INTO devices (uuid, name, key_lock_code, created, updated) VALUES (?, ?, ?, ?, ?)';
            insert_devices = mysql.format(insert_devices, [device_uuid, device_name, 'key', now, now]);
            connection.query(insert_devices, function(err, results){
                if (err) {
                    console.error(err);
                    return next(new Error('noooooooooooooooooooooo'));
                }
                return res.status(204).end();
            });
        }

        if (rows.length === 1) {
            // データが存在しかつ端末名が異なる場合、UPDATE（仮登録状態）にする。
            if (rows[0].name === device_name) {
                console.log('same device name.');
                return res.status(204).end();
            }
            now = moment().format('YYYY-MM-DD HH:mm:ss');
            var update_devices = 'UPDATE devices SET name = ?, is_registered = ?, is_enabled = ?, updated = ? WHERE uuid = ?';
            update_devices = mysql.format(update_devices, [device_name, 0, 0, now, device_uuid]);
            connection.query(update_devices, function(err, results){
                if (err) {
                    console.error(err);
                    return next(new Error('errooooooooooooooooooooor'));
                }
                return res.status(204).end();
            });
        }
    });
});

module.exports = router;
