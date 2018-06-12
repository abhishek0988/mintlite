/**
 * Fetch and manipulate stored transactions
 */

var moment = require('moment');
var sheets_db = require('./sheets.js');

var ID_COL = 0;
var DATE_COL = 2;
var FIRST_ROW_INDEX = 2;
var VERIFY_COL = 'H';
var REIMBURSE_COL = 'I';

async function getAllTransactions() {
    var rows = await sheets_db.getRows(FIRST_ROW_INDEX, sheets_db.MAX_ROWS);
    allTransactions = rows.map(function (r) {
        var t = {
            id: r[0],
            account: r[1],
            owner: r[2],
            date: r[3],
            name: r[4],
            category_primary: r[5],
            category_secondary: r[6],
            amount: r[7],
            verified: r[8],
            reimbursable: r[9]
        }
        return t;
    });
    return allTransactions;
}

async function getUnverifiedTransactions(days) {
    var allTransactions = await getLastDaysTransactions(days);
    return allTransactions.filter(t => !t.verified);
}

async function getReimbursableTransactions(days) {
    var allTransactions = await getLastDaysTransactions(days);
    return allTransactions.filter(t => !!t.reimbursable);
}

async function addTransactions(transactions) {
    await sheets_db.appendRows(transactions.map(t => Object.values(t)));
    await sheets_db.sortRows(1, DATE_COL, "DESCENDING");
}

async function toggleVerified(transactionId, user) {
    var transactions = await getAllTransactions();
    var transactionIds = transactions.map(m => m.id);
    var index = transactionIds.indexOf(transactionId);
    if (index < 0) return; // didn't find this transaction

    var currentVerified = transactions[index].verified;
    var newVerified = (!currentVerified) ? `Verified by ${user}` : '';

    var cell = `${VERIFY_COL}${getTransactionRowNumber(index)}`;

    await sheets_db.setCellValue(cell, newVerified);
}

async function toggleReimbursable(transactionId) {
    var transactions = await getAllTransactions();
    var transactionIds = transactions.map(m => m.id);
    var index = transactionIds.indexOf(transactionId);
    if (index < 0) return; // didn't find this transaction

    var currentReimburse = transactions[index].reimbursable;
    var newReimburse = (!currentReimburse) ? `Yes` : '';

    var cell = `${REIMBURSE_COL}${getTransactionRowNumber(index)}`;

    await sheets_db.setCellValue(cell, newVerified);
}

function getTransactionRowNumber(index) {
    return (index + FIRST_ROW_INDEX);
}

module.exports = {
    getAllTransactions: getAllTransactions,
    addTransactions: addTransactions
}