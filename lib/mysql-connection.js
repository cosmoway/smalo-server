// mysql-connection.js
var config = require('config').database;
var mysql = require('mysql');
var mysqlPool = mysql.createPool(config);
mysqlPool.on('connection', function(connection){
    console.log('Connected to database. connection id is ' + connection.threadId);
});

mysqlPool.on('engueue', function(){
    console.log('Waiting for available connection slot.');
});


module.exports.mysql = mysql;
module.exports.mysqlPool = mysqlPool;
