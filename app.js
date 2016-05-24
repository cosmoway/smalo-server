/**
 * smalo-server app.js
 */

var WebSocketServer = require('ws').Server
    , http = require('http')
    , fs = require('fs')
    , db = require('./lib/mysql-connection')
    , express = require('express')
    , session = require('express-session')
    , bodyParser = require('body-parser')
    , cookieParser = require('cookie-parser')
    , moment = require('moment')
    , logger = require('morgan')
    , fileStreamRotator = require('file-stream-rotator')
    , config = require('config')
    , routesDevices = require('./routes/devices')
    , routesAdminLogin = require('./routes/admin-login')
    , routesAdminHome = require('./routes/admin-home')
    , routesAdminLogs = require('./routes/admin-logs')
    , routesAdminDevices = require('./routes/admin-devices')
    , ECT = require('ect')
    , app = express()
    , slack = require('simple-slack-webhook')
    , Device = require('./device.js').Device
    , OperationLog = require('./lib/operation-log')
    , operationLog = new OperationLog(db.connection);

slack.init({ path: process.env.SLACK_WEBHOOK_URL });

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
app.use(cookieParser());
app.engine('ect', ECT({watch:true,root:__dirname + '/views', ext:'.ect'}).render);
app.set('view engine', 'ect');
app.use(express.static(__dirname + '/public'));

// セッション
app.use(session({
    secret: 'smart lock',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000
    }
}));

// 端末情報登録API
app.use('/api', routesDevices);

// 管理画面用のセッションチェック
var sessionCheck = function(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// 管理画面
app.use('/admin', routesAdminLogin);
app.use('/admin', routesAdminHome);
app.use('/admin', sessionCheck, routesAdminLogs);
app.use('/admin', routesAdminDevices);

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

var server = http.createServer(app);
var wss = new WebSocketServer({server: server});
var dbConnection = db.connection;
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
// 最後の実行コマンドに関する情報
var lastCommandInfo = null;

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
                var name = (device || {}).name || 'unknown';
                if (command != null) {
                    // 受け取った内容を代入
                    if (!device.isKey()) {
                        // 端末が鍵でなければ、コマンドは無効
                        return;
                    }
                    if (command == 'lock') {
                        // C-02. 施錠リクエスト
                        var olparams = {
                          datetime : moment().format("YYYY-MM-DD HH:mm:ss"),
                          lockStatus : "locking",
                          deviceUuid : device.uuid,
                          deviceName : name
                        };
                        console.log('[DEBUG]command lock:');
                        operationLog.saveLog(olparams);
                        lock();

                    } else if (command == 'unlock') {
                        // C-03. 解錠リクエスト
                        var olparams = {
                          datetime : moment().format("YYYY-MM-DD HH:mm:ss"),
                          lockStatus : "unlocking",
                          deviceUuid : device.uuid,
                          deviceName : name
                        };
                        console.log('[DEBUG]command unlock:');
                        operationLog.saveLog(olparams);
                        unlock();
                    }
                    // コマンド実行者情報を一時記憶
                    lastCommandInfo = {
                        command: command,
                        device: device,
                        date: new Date()
                    }

                } else if (state != null) {
                    if (!device.isLock()) {
                        // 端末が錠でなければ、錠の状態は無効
                        return;
                    }
                    currentState = state;
                    // 受け取った内容を代入
                    var olparams = {
                      datetime : moment().format("YYYY-MM-DD HH:mm:ss"),
                      lockStatus : state,
                      deviceUuid : device.uuid,
                      deviceName : name
                    };

                    // S-01. 鍵の状態の通知
                    var message = '{"state": "%s" }'.replace(/%s/, currentState);
                    var enableOnly = true;
                    console.log('[DEBUG]command edison:'+ state);
                    operationLog.saveLog(olparams);
                    devices.keyFilter().broadcast(message, enableOnly);

                    // slack に状態を投稿する
                    var st = (currentState == 'locked') ? '施錠' :
                        (currentState == 'unlocked') ? '解錠' : null;
                    if (st != null) {
                        var keyDevice = null;
                        if (lastCommandInfo != null) {
                            if (lastCommandInfo['command'] == 'lock' && currentState == 'locked'
                                || lastCommandInfo['command'] == 'unlock' && currentState == 'unlocked') {
                                keyDevice = lastCommandInfo['device'];
                            }
                        }
                        var keyName = (keyDevice || {}).name || 'manual';
                        var message = '玄関のドアを%state%しました（ :key: %key%）'
                            .replace(/%state%/, st)
                            .replace(/%key%/, keyName);
                        slack.text(message);
                    }
                    lastCommandInfo = null;
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

server.listen(5000);
