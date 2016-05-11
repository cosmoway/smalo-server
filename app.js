/**
 * smalo-server app.js
 */

var WebSocketServer = require('ws').Server
    , https = require('https')
    , fs = require('fs')
    , mysql = require('mysql')
    , express = require('express')
    , app = express()
    , Device = require('./device.js').Device;
var credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/fullchain.pem', 'utf8')
};

app.use(express.static(__dirname + '/public'));
var server = https.createServer(credentials, app);
var wss = new WebSocketServer({server: server});
var dbConnection = mysql.createConnection({
    host     : 'localhost',
    user     : 'smalo',
    password : 'RoMV35ZMQKKLQa8i',
    database : 'smalo_db'
});
dbConnection.connect(function(err) {
    if (err) {
        console.error('[DEBUG] mysql error connecting: ' + err.stack);
        return;
    }
    console.log('[DEBUG] mysql connected as id ' + dbConnection.threadId);
});

var devices = [];

Device.load(dbConnection, function (results) {
    devices = results;
});

wss.on('connection', function (ws) {
    console.log('[DEBUG] open connection.');

    ws.on('close', function () {
        console.log('[DEBUG] closed connection.');
    });

    ws.on('message', function (message) {
        console.log('[DEBUG] received message: %s'.replace(/%s/, message));

        var jsonObject;
        try {
            jsonObject = JSON.parse(message);
        } catch (e) {
            console.log(e);
            return;
        }

        try {
            var uuid = jsonObject['uuid'];
            var command = jsonObject['command'];

            if (uuid != null) {
                // C-01. 接続時
                // UUID 認証
                for (var i = 0; i < devices.length; i++) {
                    var device = devices[i];
                    if (device.uuid === uuid) {
                        device.connection = ws;

                        console.log('[DEBUG] increase connection.');

                        // TODO: 現在の鍵の状態をクライアントに伝える
                        device.send('{"state" : "lock"}');

                        break;
                    }
                }

            } else if (command != null) {
                if (command == 'lock') {
                    // C-02. 施錠リクエスト
                    lock();

                } else if (command == 'unlock') {
                    // C-03. 解錠リクエスト
                    unlock();
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
    });
});

/**
 * 施錠処理
 */
function lock() {
    console.log('[DEBUG] receive lock request.');

    // Edison に施錠リクエストを送る
    devices.lockFilter().broadcast('{"command" : "lock"}')
    // setTimeout(function () {
    //     broadcast({state: 'lock'});
    // }(), 1000);
}

/**
 * 解錠処理
 */
function unlock() {
    console.log('[DEBUG] receive unlock request.');

    // Edison に解錠リクエストを送る
    devices.lockFilter().broadcast('{"command" : "unlock"}')
    // setTimeout(function () {
    //     broadcast({state: 'unlock'});
    // }(), 1000);
}

/**
 * 接続されているクライアントにデータを broadcast する
 *
 * @param object
 */
function broadcast(object) {
    var message = JSON.stringify(object);
    devices.broadcast(message);
    console.log('[DEBUG] broadcast message: %s'.replace(/%s/, message));
}

server.listen(8443);
