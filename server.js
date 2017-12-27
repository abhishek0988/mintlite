var express = require('express');

var APP_PORT = process.env.PORT || 3000; // heroku assigns a port
var app = express();

app.get('/', function (req, res) {
    res.send('Mint Lite - A lightweight app to manage financial transactions')
});

app.listen(APP_PORT, function () {
    console.log('Server running on port: ' + String(APP_PORT));
});