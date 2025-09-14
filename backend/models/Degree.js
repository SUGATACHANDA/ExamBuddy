const mongoose = require('mongoose');
const degreeSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., Bachelor of Technology
    college: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Degree', degreeSchema);