// devices.js
var debug = require('debug')('smalo-server:api');
var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
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
    var insert_devices = 'INSERT INTO devices (uuid, name, key_lock_code, created, updated) VALUES (?, ?, ?, ?, ?)';
    var insert_values = [device_uuid, device_name, 'key', now, now];
    insert_devices = mysql.format(insert_devices, insert_values);
    connection.query(insert_devices, function(err, results){
        if (err) {
            console.error(err);
            return next(new Error('noooooooooooooooooooooo'));
        }
        return res.status(204).end();
    });
});

module.exports = router;
