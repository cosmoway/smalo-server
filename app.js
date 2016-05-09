/**
 * smalo-server app.js
 */

var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express();

app.use(express.static(__dirname + '/public'));
var server = http.createServer(app);
var wss = new WebSocketServer({server: server});

var connections = [];

wss.on('connection', function (ws) {
    console.log('[DEBUG] open connection.');

    ws.on('close', function () {
        connections = connections.filter(function (conn, i) {
            return (conn !== ws);
        });
        console.log('[DEBUG] closed connection. count: %d'.replace(/%d/, connections.length));
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
                // TODO: UUID 認証をする
                if (connections.indexOf(ws) < 0) {
                    connections.push(ws);
                    console.log('[DEBUG] increase connection count: %d'.replace(/%d/, connections.length));

                    // TODO: 現在の鍵の状態をクライアントに伝える
                    ws.send('{"state" : "lock"}');
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

    // TODO: Edison に施錠リクエストを送る
    setTimeout(function () {
        broadcast({state: 'lock'});
    }(), 1000);
}

/**
 * 解錠処理
 */
function unlock() {
    console.log('[DEBUG] receive unlock request.');

    // TODO: Edison に解錠リクエストを送る
    setTimeout(function () {
        broadcast({state: 'unlock'});
    }(), 1000);
}

/**
 * 接続されているクライアントにデータを broadcast する
 *
 * @param object
 */
function broadcast(object) {
    var message = JSON.stringify(object);
    connections.forEach(function (con, i) {
        con.send(message);
    });
    console.log('[DEBUG] broadcast message: %s'.replace(/%s/, message));
}

server.listen(process.env.PORT || 5000);
