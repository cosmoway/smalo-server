// admin-home.js
var debug = require('debug')('smalo-server:admin:home');
var express = require('express');
var db = require('../lib/mysql-connection');
var moment = require('moment');
var config = require('config').database;
var mysql = db.mysql;
var connection = db.connection;

var router = express.Router();
router.get(/^\/$/, function(req, res, next){
    res.redirect('/admin/logs');
});

module.exports = router;
