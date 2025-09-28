// models/Result.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Question' },
    submittedAnswer: String,
    status: {
        type: String,
        enum: ['answered', 'notAnswered', 'markedForReview', 'answeredAndMarked'],
        default: 'notAnswered',
    }
});

const resultSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    totalMarks: {
        type: Number,
        required: true,
    },
    // Storing the answers for review
    answers: [answerSchema],
    // For proctoring flags
    proctoringLog: [{
        event: String, // e.g., 'TAB_SWITCH', 'COPY_PASTE_ATTEMPT'
        timestamp: { type: Date, default: Date.now },
    }],
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'expelled'],
        default: 'ongoing',
    },
}, {
    timestamps: true,
});

const Result = mongoose.model('Result', resultSchema);
module.exports = Result;