// controllers/questionController.js
const asyncHandler = require('express-async-handler');
const Question = require('../models/Question');

// @desc    Create a new question
// @route   POST /api/questions
// @access  Private/Teacher
// Create Question
const createQuestion = asyncHandler(async (req, res) => {
    const { subjectId, questionType, questionText, options, correctAnswer, correctAnswers, expectedAnswer, marks } = req.body;

    if (!subjectId || !questionType || !questionText)
        return res.status(400).json({ message: "Missing fields" });

    const data = {
        subject: subjectId,
        questionType,
        questionText,
        marks,
        createdBy: req.user._id
    };

    if (questionType === "mcq") {
        data.options = options;
        data.correctAnswer = correctAnswer;
    } else if (questionType === "multiple_select") {
        data.options = options;
        data.correctAnswers = correctAnswers;
    } else if (questionType === "short_answer") {
        data.expectedAnswer = expectedAnswer;
    }

    const question = await Question.create(data);
    res.status(201).json(question);
});

// Bulk Insert
const createBulkQuestions = asyncHandler(async (req, res) => {
    const { subjectId, questions } = req.body;
    if (!subjectId || !questions?.length)
        return res.status(400).json({ message: "Invalid request" });

    const docs = questions.map(q => ({
        subject: subjectId,
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        expectedAnswer: q.expectedAnswer,
        marks: q.marks,
        createdBy: req.user._id
    }));

    await Question.insertMany(docs);
    res.json({ success: true, count: docs.length });
});


// @desc    Get questions for the logged-in teacher
// @route   GET /api/questions
// @access  Private/Teacher
const getTeacherQuestions = async (req, res) => {
    try {
        const questions = await Question.find({ createdBy: req.user.id })
            .populate("subject", "name");

        res.json(questions);
    } catch (err) {
        console.error("Fetch Questions Error:", err);
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

/** 
 @desc    Update a question
 @route   PUT /api/questions/:id
 @access  Private/Teacher
**/
const updateQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
        res.status(404);
        throw new Error('Question not found');
    }

    // Ensure the teacher updating the question is the one who created it
    if (question.createdBy.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized to update this question');
    }

    const { questionText, options, correctAnswer, marks } = req.body;

    question.questionText = questionText || question.questionText;
    question.options = options || question.options;
    question.correctAnswer = correctAnswer || question.correctAnswer;
    if (marks !== undefined) question.marks = marks;

    const updatedQuestion = await question.save();
    res.json(updatedQuestion);
});

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private/Teacher
const deleteQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
        res.status(404);
        throw new Error('Question not found');
    }

    if (question.createdBy.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    await question.deleteOne(); // Use deleteOne()
    res.json({ message: 'Question removed' });
});

module.exports = { createQuestion, getTeacherQuestions, updateQuestion, deleteQuestion, createBulkQuestions };