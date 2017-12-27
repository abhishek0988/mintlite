'use strict';

var google = require('googleapis');
var google_key = require('../secrets/google_key.json');

// configure a JWT auth client
let jwtClient = new google.auth.JWT(
    google_key.client_email,
    null,
    google_key.private_key,
    ['https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive']
);

//authenticate request
jwtClient.authorize(function (err, tokens) {
    if (err) {
        console.log(err);
        return;
    }
});

module.exports = jwtClient;