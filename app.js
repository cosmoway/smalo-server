/**
 * smalo-server app.js
 */

var WebSocketServer = require('ws').Server
    , https = require('https')
    , fs = require('fs')
    , mysql = require('mysql')
    , express = require('express')
    , bodyParser = require('body-parser')
    , routesDevices = require('./routes/devices')
    , app = express();
var credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/fullchain.pem', 'utf8')
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use('/api', routesDevices);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    //log.debug('404 not found error.');

    var err = new Error('Not Found');
    err.status = 404;
    err.status_message = 'Request URL Not Found.';
    next(err);
});

// error handlers
app.use(function(err, req, res, next) {
    //log.debug('catch all(error handler).');

    res.status(err.status || 500);
    res.json({
        status: err.status_message,
        message: err.message
    });
});

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
        console.error('[mysql] error connecting: ' + err.stack);
        return;
    }
    console.log('[mysql] connected as id ' + dbConnection.threadId);
});

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

server.listen(8443);
