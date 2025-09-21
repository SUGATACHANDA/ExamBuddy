// backend/models/Token.js
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    token: {
        type: String,
        required: true,
    },
    // The token will automatically expire after a set time (e.g., 10 minutes)
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // 600 seconds = 10 minutes
    },
});

const Token = mongoose.model('Token', tokenSchema);
module.exports = Token