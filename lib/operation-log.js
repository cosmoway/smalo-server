// operation-log.js
var debug = require('debug')('smalo');

function OperationLog (connection) {
    this.connection = connection;
}

/**
 * 操作ログを保存する。
 * {datetime: 'YYYY-MM-DD hh:mm:ss', lockStatus: 'locked', deviceUuid: '', deviceName: ''}
 *
 * @param params ログデータ
 */
OperationLog.prototype.saveLog = function(params) {
    var insertSql = 'INSERT INTO operation_logs (operation_datetime, lock_status, device_uuid, device_name) VALUES (?, ?, ?, ?)';
    var insertValues = [params.datetime, params.lockStatus, params.deviceUuid, params.deviceName];
    this.connection.query(insertSql, insertValues, function(error, result){
        debug('Save Log: ' + insertSql, insertValues);
        if (error) throw error;
        console.log('[DEBUG]: Save OperationLogs Success.');
    });
}

module.exports = OperationLog;
