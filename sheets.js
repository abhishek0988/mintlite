/**
 * Wrapper methods for storing and retrieving data in Google Sheets
 */

'use strict';

var google = require('googleapis');
var sheets = google.sheets('v4');

var config = require('./config.json');
var google_client = require('./google/google_client.js');

async function getRows(start, end) {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.values.get({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            range: `A${start}:Y${end}`,
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

async function appendRows(rows) {
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

async function sortRows(startRowIndex, columnIndex, order) {
    return new Promise(async function (resolve, reject) {
        sheets.spreadsheets.batchUpdate({
            auth: google_client,
            spreadsheetId: config.google_sheet_id,
            resource: {
                requests: [{
                    sortRange: {
                        range: {
                            sheetId: 0,
                            startRowIndex: startRowIndex
                        },
                        sortSpecs: [{
                            dimensionIndex: columnIndex,
                            sortOrder: order
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

module.exports = {
    MAX_ROWS: 400000,
    getRows: getRows,
    appendRows: appendRows,
    sortRows: sortRows
}