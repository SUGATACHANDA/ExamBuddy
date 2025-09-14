// backend/models/College.js

const mongoose = require('mongoose');

// --- THE CORRECTED SCHEMA ---
const collegeSchema = new mongoose.Schema({
    // The `name` should be the unique identifier for a college.
    name: {
        type: String,
        required: true,
        unique: true, // This ensures you cannot have two colleges with the same name.
        trim: true    // Removes any leading/trailing whitespace
    },
    location: {
        type: String,
        required: true
    },
    // The problematic "code" field has been removed completely.
}, { timestamps: true });

module.exports = mongoose.model('College', collegeSchema);