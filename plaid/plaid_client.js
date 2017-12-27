'use strict';

var plaid = require('plaid');
var plaid_key = require('../secrets/plaid_secrets.json');

// Initialize the Plaid client
var client = new plaid.Client(
    plaid_key.PLAID_CLIENT_ID,
    plaid_key.PLAID_SECRET,
    plaid_key.PLAID_PUBLIC_KEY,
    plaid.environments[plaid_key.PLAID_ENV]
);

module.exports = client;