/**
 * device.js
 */
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

function Device(param) {
    param = param || {};
    this.connection = param.connection;
    this.uuid = param.uuid;
    this.name = param.name;
    this.key_lock_code = param.key_lock_code;
    this.is_registered = param.is_registered;
    this.is_enabled = param.is_enabled;
}

Device.prototype.isKey = function () {
    return this.key_lock_code == 'key';
};

Device.prototype.isLock = function () {
    return this.key_lock_code == 'lock';
};

Device.prototype.isEnabled = function () {
    return this.is_enabled && this.is_registered;
}

/**
 * devices テーブルから端末一覧を問い合わせる
 *
 * @param dbConnection
 * @param callback
 */
Device.load = function (dbConnection, callback) {
    var sql = 'SELECT * FROM devices';
    dbConnection.query(sql, function (error, results, fields) {
        if (error) throw error;
        var devices = [];
        results.forEach(function (result) {
            var device = new Device(result);
            devices.push(device);
        });

        if (callback != null) {
            callback(devices);
        }
    });
};

/**
 * デバイスリストの変更を通知するためのトリガーを発行する
 */
Device.emitChange = function () {
    emitter.emit('devicesChanged');
};

/**
 * デバイスリスト更新時にデバイスリストを受け取るためのコールバックをセットする
 *
 * @param dbConnection
 * @param callback
 */
Device.setOnChange = function (dbConnection, callback) {
    emitter.on('devicesChanged', function () {
        console.log('[DEBUG] devices data was changed.');
        // 最新のデバイスリストを問い合わせる
        Device.load(dbConnection, callback);
    });
};

/**
 * 配列から指定された条件の端末を検索する
 *
 * @param devices
 * @param param
 */
Device.find = function (devices, param) {
    var result = devices.filter(function (item) {
        if (item instanceof Device) {
            var device = item;
            if (param.connection != null) {
                if (param.connection != device.connection) {
                    return false;
                }
            }
            if (param.uuid != null) {
                if (param.uuid != device.uuid) {
                    return false;
                }
            }
            if (param.name != null) {
                if (param.name != device.name) {
                    return false;
                }
            }
            if (param.key_lock_code != null) {
                if (param.key_lock_code != device.key_lock_code) {
                    return false;
                }
            }
            if (param.is_registered != null) {
                if (param.is_registered != device.is_registered) {
                    return false;
                }
            }
            if (param.is_enabled != null) {
                if (param.is_enabled != device.is_enabled) {
                    return false;
                }
            }
            return true;
        }
        return false;
    });
    return result[0] || null;
};

/**
 * WebSocket でメッセージを送信する
 *
 * @param message
 * @param enableOnly
 */
Device.prototype.send = function (message, enableOnly) {
    if (enableOnly) {
        // 有効でない端末には送信しない
        if (!this.isEnabled()) {
            return;
        }
    }
    var connection = this.connection;
    if (connection != null) {
        console.log('[DEBUG] %NAME%: <=== send message: %MESSAGE%'
            .replace(/%NAME%/, this.name)
            .replace(/%MESSAGE%/, message));
        connection.send(message)
    }
};

/**
 * WebSocket でメッセージをブロードキャストする
 *
 * @param message
 * @param enableOnly
 */
Array.prototype.broadcast = function (message, enableOnly) {
    var array = this;
    console.log('[DEBUG] broadcast message: %MESSAGE%'
        .replace(/%MESSAGE%/, message));
    array.forEach(function (item) {
        if (item instanceof Device) {
            var device = item;
            device.send(message, enableOnly);
        }
    });
};

/**
 * 配列の要素から鍵のデバイスのみを残して返す
 * 
 * @returns {Array.<T>}
 */
Array.prototype.keyFilter = function () {
    return this.filter(function (item) {
        if (item instanceof Device) {
            var device = item;
            return device.isKey();
        }
        return false;
    });
};

/**
 * 配列の要素から錠のデバイスのみを残して返す
 *
 * @returns {Array.<T>}
 */
Array.prototype.lockFilter = function () {
    return this.filter(function (item) {
        if (item instanceof Device) {
            var device = item;
            return device.isLock();
        }
        return false;
    });
};

exports.Device = Device;