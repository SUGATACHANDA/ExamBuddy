const mongoose = require('mongoose');
const courseSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., Computer Science and Engineering
    degree: { type: mongoose.Schema.Types.ObjectId, ref: 'Degree', required: true },
    // department: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Department',
    //     required: true
    // }
}, { timestamps: true });
module.exports = mongoose.model('Course', courseSchema);