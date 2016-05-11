/**
 * device.js
 */

function Device(param) {
    this.connection = param.connection;
    this.uuid = param.uuid;
    this.name = param.name;
    this.key_lock_code = param.key_lock_code;
    this.is_registered = param.is_registered;
    this.is_enabled = param.is_enabled;
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
 * WebSocket でメッセージを送信する
 *
 * @param message
 */
Device.prototype.send = function (message) {
    var connection = this.connection;
    if (connection != null) {
        connection.send(message)
    }
};

/**
 * WebSocket でメッセージをブロードキャストする
 *
 * @param message
 */
Array.prototype.broadcast = function (message) {
    var array = this;
    array.forEach(function (item) {
        if (item instanceof Device) {
            var device = item;
            device.send(message);
        }
    });
};

exports.Device = Device;