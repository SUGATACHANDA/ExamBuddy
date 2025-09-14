const mongoose = require('mongoose');
const semesterSchema = new mongoose.Schema({
    number: { type: Number, required: true, min: 1, max: 8 }, // e.g., 5
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
}, { timestamps: true });
module.exports = mongoose.model('Semester', semesterSchema);