const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., Department of CSE
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Department', departmentSchema);