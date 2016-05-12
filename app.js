/**
 * smalo-server app.js
 */

var WebSocketServer = require('ws').Server
    , https = require('https')
    , fs = require('fs')
    , mysql = require('mysql')
    , express = require('express')
    , bodyParser = require('body-parser')
    , logger = require('morgan')
    , fileStreamRotator = require('file-stream-rotator')
    , routesDevices = require('./routes/devices')
    , ECT = require('ect')
    , app = express()
    , Device = require('./device.js').Device;

var credentials = {
    key: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/smalo.cosmoway.net/fullchain.pem', 'utf8')
};

// ログ設定
var logDirectory = __dirname + '/logs';
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
// アクセスログ（Express）用
var accessLogStream = fileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false
});
// 日付のフォーマットを変更
logger.token('date', function getDateToken(req, res, format) {
    return moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ');
});
app.use(logger('combined', {stream: accessLogStream}));
if (app.get('env') === 'development') {
    app.use(logger('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('ect', ECT({watch:true,root:__dirname + '/views', ext:'.ect'}).render);
app.set('view engine', 'ect');
app.use(express.static(__dirname + '/public'));

// 端末情報登録API
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
        console.error('[DEBUG] mysql error connecting: ' + err.stack);
        return;
    }
    console.log('[DEBUG] mysql connected as id ' + dbConnection.threadId);
});

// 錠の状態
var currentState = 'unknown';
// 端末リスト
var devices = [];

Device.load(dbConnection, function (results) {
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var device = Device.find(devices, {uuid: result.uuid});
        result.connection = (device || {}).connection;
    }
    devices = results;
});
Device.setOnChange(dbConnection, function (results) {
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var device = Device.find(devices, {uuid: result.uuid});
        result.connection = (device || {}).connection;
    }
    devices = results;
    console.log('[DEBUG] device list was updated.');
});

wss.on('connection', function (ws) {
    console.log('[DEBUG] open connection.');

    ws.on('close', function () {
        var device = Device.find(devices, {connection: ws});
        if (device != null) {
            device.connection = null;
        }
        var name = (device || {}).name || 'unknown';
        console.log('[DEBUG] %NAME%: closed connection.'.replace(/%NAME%/, name));
    });

    ws.on('message', function (message) {
        var name = (Device.find(devices, {connection: ws}) || {}).name || 'unknown';
        console.log('[DEBUG] %NAME%: ===> received message: %MESSAGE%'
            .replace(/%NAME%/, name)
            .replace(/%MESSAGE%/, message));

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
            var state = jsonObject['state'];

            if (uuid != null) {
                // C-01. 接続時
                // UUID 認証
                var device = Device.find(devices, {uuid: uuid});
                if (device != null) {
                    device.connection = ws;

                    console.log('[DEBUG] %NAME%: authorized.'.replace(/%NAME%/, device.name));

                    // 現在の錠の状態をクライアントに伝える
                    if (device.isEnabled() && device.isKey()) {
                        device.send('{"state" : "%s"}'.replace(/%s/, currentState));
                    }
                }
            } else {
                var device = Device.find(devices, {connection: ws});
                if (device == null || !device.isEnabled()) {
                    // TODO: WebSocket コネクションを切断するべき？
                    return;
                }
                if (command != null) {
                    if (!device.isKey()) {
                        // 端末が鍵でなければ、コマンドは無効
                        return;
                    }
                    if (command == 'lock') {
                        // C-02. 施錠リクエスト
                        lock();

                    } else if (command == 'unlock') {
                        // C-03. 解錠リクエスト
                        unlock();
                    }

                } else if (state != null) {
                    if (!device.isLock()) {
                        // 端末が錠でなければ、錠の状態は無効
                        return;
                    }
                    currentState = state;

                    // S-01. 鍵の状態の通知
                    var message = '{"state": "%s" }'.replace(/%s/, currentState);
                    var enableOnly = true;
                    devices.keyFilter().broadcast(message, enableOnly);
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
    console.log('[DEBUG] do locking.');

    // Edison に施錠リクエストを送る
    devices.lockFilter().broadcast('{"command" : "lock"}');
}

/**
 * 解錠処理
 */
function unlock() {
    console.log('[DEBUG] do unlocking.');

    // Edison に解錠リクエストを送る
    devices.lockFilter().broadcast('{"command" : "unlock"}');
}

server.listen(8443);
