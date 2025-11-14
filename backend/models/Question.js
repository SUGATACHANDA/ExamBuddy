const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    questionType: {
        type: String,
        enum: ["mcq", "multiple_select", "short_answer"],
        default: "mcq"
    },
    questionText: { type: String, required: true },

    // ✅ MCQ / Multiple Select
    options: [{ type: String }],
    correctAnswer: { type: String },            // for MCQ
    correctAnswers: [{ type: String }],         // for multiple select

    // ✅ Short answer type
    expectedAnswer: { type: String },

    marks: { type: Number, default: 1 },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Question", questionSchema);
