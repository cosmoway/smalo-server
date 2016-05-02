var WebSocketServer = require('ws').Server
    , http = require('http')
    , express = require('express')
    , app = express();

app.use(express.static(__dirname + '/'));
var server = http.createServer(app);
var wss = new WebSocketServer({server: server});

var connections = [];

wss.on('connection', function (ws) {
    connections.push(ws);

    ws.on('close', function () {
        connections = connections.filter(function (conn, i) {
            return (conn !== ws);
        });
    });

    ws.on('message', function (message) {
        // TODO:
    });
});

server.listen(process.env.PORT || 5000);
