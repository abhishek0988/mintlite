'use strict';

var moment = require('moment');

var config = require('./config.json');
var plaid_client = require('./plaid/plaid_client.js');
var transaction_db = require('./transaction.js');
var util = require('./util.js');

/**
 * Fetch and upload new transactions
 */
uploadLatestTransactions();

async function uploadLatestTransactions() {
    // get latest transanctions from Plaid
    try {
        var transactions = await getNewTransactions();
        console.log(`Fetched ${transactions.length} transactions from Plaid.`);
    } catch (e) {
        console.log(`Error fetching transactions from Plaid: ${JSON.stringify(e)}`);
        return 0;
    }

    // filter out transactions we already have
    try {
        var oldTransactions = await transaction_db.getLastDaysTransactions(30);
        var oldTransactionsIds = oldTransactions.map(m => m.id);
        console.log(`Fetched ${oldTransactionsIds.length} old transactions from GSheets.`);
    } catch (e) {
        console.log(`Error fetching old transactions: ${JSON.stringify(e)}`);
        return 0;
    }
    var newTransactions = transactions.filter(t => oldTransactionsIds.indexOf(t.id) == -1);

    if (newTransactions.length > 0) {
        // insert new transactions into google sheet
        try {
            await transaction_db.addTransactions(newTransactions);
            console.log(`Added ${newTransactions.length} transactions to GSheets.`);
        } catch (e) {
            console.log(`Error adding new transactions: ${JSON.stringify(e)}`);
            return 0;
        }
    }

    return newTransactions.length;
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
                console.log(`ERROR: Couldn't fetch transactions with access token: ${config.plaid_access_tokens[i]} with error: ${JSON.stringify(e)}`)
                continue;
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
            transaction.account = accounts[transaction.account_id] || '';
            parsedTransactions.push(getNewTransaction(transaction));
        }

        resolve(parsedTransactions);
    });
}

function getNewTransaction(plaidTransaction) {
    return {
        "id": plaidTransaction.transaction_id,
        "account": plaidTransaction.account,
        "owner": plaidTransaction.account_owner ? util.toTitleCase(plaidTransaction.account_owner.split(' ')[0]) : '',
        "date": plaidTransaction.date,
        "name": util.toTitleCase(plaidTransaction.name),
        "category_primary": plaidTransaction.category ? plaidTransaction.category[0] : '',
        "category_secondary": plaidTransaction.category ? plaidTransaction.category[1] : '',
        "amount": plaidTransaction.amount,
        "verified": undefined,
        "reimbursable": undefined
    };
}
