'use strict';

var moment = require('moment');
var google = require('googleapis');

var config = require('./config.json');
var util = require('./util.js');

var google_client = require('./google/google_client.js');
var plaid_client = require('./plaid/plaid_client.js');
let sheets = google.sheets('v4');

uploadLatestTransactions();

async function uploadLatestTransactions() {
    // get latest transanctions from Plaid
    try {
        var transactions = await getNewTransactions();
        console.log(`Fetched ${transactions.length} transactions from Plaid.`);
    } catch (e) {
        console.log(`Error fetching transactions: ${JSON.stringify(e)}`);
        return 0;
    }

    // filter out transactions we already have
    try {
        var oldTransactions = await getOldTransactions();
        var oldTransactionsIds = oldTransactions.map(m => m[0]);
        console.log(`Fetched ${oldTransactionsIds.length} old transactions from GSheets.`);
    } catch (e) {
        console.log(`Error fetching old transactions: ${JSON.stringify(e)}`);
        return 0;
    }
    var newTransactions = transactions.filter(t => oldTransactionsIds.indexOf(t.id) == -1);

    if (newTransactions.length > 0) {
        // insert new transactions into google sheet
        try {
            await addTransactions(newTransactions.map(t => Object.values(t)));
            console.log(`Added ${newTransactions.length} transactions to GSheets.`);
        } catch (e) {
            console.log(`Error adding new transactions: ${JSON.stringify(e)}`);
            return 0;
        }

        // sort the sheet
        try {
            await sortTransactions();
            console.log(`Sorted GSheets.`);
        } catch (e) {
            console.log(`Error sorting transactions: ${JSON.stringify(e)}`);
        }
    }

    return newTransactions.length;
}

async function clearTransactions() {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.values.clear({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            range: `2:400000`, // max number of rows       
        }, function (e, response) {
            if (e) {
                reject(e);
            }
            else {
                resolve(response.clearedRange);
            }
        });
    });
}

async function getNewTransactions() {
    return new Promise(async function (resolve, reject) {
        var start = moment().subtract(config.days_to_fetch, 'days').format('YYYY-MM-DD');
        var end = moment().format('YYYY-MM-DD');
        var accounts = {};
        var transactions = [];
        var parsedTransactions = [];

        for (var i = 0; i < config.plaid_access_tokens.length; i++) {
            try {
                var transactionsResponse = await plaid_client.getTransactions(
                    config.plaid_access_tokens[i],
                    start,
                    end,
                    { count: 250, offset: 0 }
                );
            } catch (e) {
                reject(e);
            }

            // set account names
            for (var j = 0; j < transactionsResponse.accounts.length; j++) {
                var account_id = transactionsResponse.accounts[j].account_id;
                var account_name = transactionsResponse.accounts[j].official_name || transactionsResponse.accounts[j].name || '';
                if (account_id) {
                    accounts[account_id] = util.toTitleCase(account_name.replace(/credit card/i, '').trim());
                }
            }

            // save transactions
            transactions.push(...transactionsResponse.transactions);
        }

        // parse transactions and take only what we need
        for (var t = 0; t < transactions.length; t++) {
            var transaction = transactions[t];
            if (transaction.pending) continue; // ignore pending transactions
            parsedTransactions.push({
                "id": transaction.transaction_id,
                "account": accounts[transaction.account_id] || '',
                "owner": transaction.account_owner ? util.toTitleCase(transaction.account_owner.split(' ')[0]) : '',
                "date": transaction.date,
                "name": util.toTitleCase(transaction.name),
                "category_primary": transaction.category ? transaction.category[0] : '',
                "category_secondary": transaction.category ? transaction.category[1] : '',
                "amount": transaction.amount
            });
        }

        resolve(parsedTransactions);
    });
}

async function getOldTransactions() {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.values.get({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            range: 'A2:A1000', // fetches latest 1000 transactions        
        }, function (e, response) {
            if (e) {
                reject(e);
            }
            else {
                resolve(response.values || []);
            }
        });
    });
}

async function addTransactions(rows) {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.values.append({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            range: config.google_sheet_name,
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        }, function (e, response) {
            if (e) {
                reject(e);
            }
            else {
                resolve(response);
            }
        });
    });
}

async function sortTransactions() {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.batchUpdate({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            resource: {
                requests: [{
                    sortRange: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 1
                        },
                        sortSpecs: [{
                            dimensionIndex: 3,
                            sortOrder: "DESCENDING"
                        }]
                    }
                }]
            }
        }, function (e, response) {
            if (e) {
                reject(e);
            }
            else {
                resolve(response || null);
            }
        });
    });
}
