// admin-home.js
var debug = require('debug')('smalo-server:admin:logs');
var express = require('express');
var mysql = require('mysql');
var moment = require('moment');
var config = require('config').database;
var connection = mysql.createConnection(config);

var router = express.Router();
router.get(/^\/$/, function(req, res, next){
    res.redirect('/admin/logs');
});

module.exports = router;
