/**
 * Fetch and manipulate stored transactions
 */

var moment = require('moment');
var sheets_db = require('./sheets.js');

var ID_COL = 0;
var DATE_COL = 3;

async function getLastDaysTransactions(days) {
    var start = moment().subtract(days, 'days').format('YYYY-MM-DD');
    var allTransactions = await getAllTransactions();
    return allTransactions.filter(t => moment(t.date).isSameOrAfter(start));
}

async function getAllTransactions() {
    var rows = await sheets_db.getRows(2, sheets_db.MAX_ROWS);
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
            verified: r[8]
        }
        return t;
    });
    return allTransactions;
}

async function addTransactions(transactions) {
    await sheets_db.appendRows(transactions.map(t => Object.values(t)));
    await sheets_db.sortRows(1, DATE_COL, "DESCENDING");
}

module.exports = {
    getLastDaysTransactions: getLastDaysTransactions,
    addTransactions: addTransactions
}