// mysql-connection.json
var config = require('config').database;
var mysql = require('mysql');
var connection = mysql.createConnection(config);

module.exports.mysql = mysql;
module.exports.connection = connection;
