// logger.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Log errors to a file in the user's data directory.
// This is a reliable location that your app will have permission to write to.
const logFilePath = path.join(app.getPath('userData'), 'app-errors.log');

function logError(error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `${timestamp} - ERROR: ${error.stack || error}\n\n`;
    try {
        fs.appendFileSync(logFilePath, errorMessage);
    } catch (writeErr) {
        console.error("Failed to write to log file:", writeErr);
    }
}

module.exports = { logError };