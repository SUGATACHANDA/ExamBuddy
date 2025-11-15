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
        throw new Error("Question not found");
    }

    if (question.createdBy.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error("Not authorized to update this question");
    }

    const {
        questionText,
        questionType,
        options,
        correctAnswer,
        correctAnswers,
        expectedAnswer,
        marks
    } = req.body;

    console.log("📨 UPDATE REQUEST BODY:", req.body);

    // Update basic fields
    if (questionText !== undefined) question.questionText = questionText;
    if (marks !== undefined) question.marks = marks;

    // Handle question type changes
    const targetQuestionType = questionType || question.questionType;

    if (questionType && questionType !== question.questionType) {
        // Question type is changing - clear all fields
        question.questionType = questionType;
        question.options = [];
        question.correctAnswer = "";
        question.correctAnswers = [];
        question.expectedAnswer = "";
    }

    // Update type-specific fields based on the TARGET question type
    if (targetQuestionType === "mcq") {
        console.log("🔄 Processing as MCQ");
        if (options !== undefined) question.options = options;
        if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
        // Clear other fields
        question.correctAnswers = [];
        question.expectedAnswer = "";
    }
    else if (targetQuestionType === "multiple_select") {
        console.log("🔄 Processing as Multiple Select");
        if (options !== undefined) question.options = options;
        if (correctAnswers !== undefined) question.correctAnswers = correctAnswers;
        // Clear other fields
        question.correctAnswer = "";
        question.expectedAnswer = "";
    }
    else if (targetQuestionType === "short_answer") {
        console.log("🔄 Processing as Short Answer");
        if (expectedAnswer !== undefined) {
            console.log("📝 Setting expectedAnswer:", expectedAnswer);
            question.expectedAnswer = expectedAnswer;
        }
        // Clear other fields
        question.options = [];
        question.correctAnswer = "";
        question.correctAnswers = [];
    }

    console.log("💾 Saving question:", {
        questionType: question.questionType,
        expectedAnswer: question.expectedAnswer,
        questionText: question.questionText
    });

    const updated = await question.save();
    console.log("✅ Saved question:", {
        _id: updated._id,
        questionType: updated.questionType,
        expectedAnswer: updated.expectedAnswer
    });

    res.json(updated);
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