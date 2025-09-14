// controllers/resultController.js
const asyncHandler = require('express-async-handler');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

// @desc    Submit an exam
// @route   POST /api/results/submit
// @access  Private/Student
const submitExam = asyncHandler(async (req, res) => {
    const { examId, answers } = req.body;
    const studentId = req.user._id;

    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    // Check if already submitted
    const existingResult = await Result.findOne({ exam: examId, student: studentId });
    if (existingResult) {
        res.status(400);
        throw new Error("You have already submitted this exam.");
    }

    let score = 0;
    const totalMarks = exam.questions.length;

    exam.questions.forEach(question => {
        const studentAnswer = answers.find(ans => ans.questionId === question._id.toString());
        if (studentAnswer && studentAnswer.submittedAnswer === question.correctAnswer) {
            score++;
        }
    });

    const result = await Result.create({
        exam: examId,
        student: studentId,
        score,
        totalMarks,
        answers,
        status: 'completed',
    });

    res.status(201).json(result);
});

/**
 * @desc    Get results for a specific exam (for Teachers and HODs)
 * @route   GET /api/results/exam/:examId
 * @access  Private/Teacher, Private/HOD
 */
const getResultsForExam = asyncHandler(async (req, res) => {
    // 1. Fetch the exam and populate its semester and department for the check.
    const exam = await Exam.findById(req.params.examId)
        .populate({
            path: 'semester',
            select: 'department number', // Select the fields we need
            populate: {
                path: 'department',
                select: 'name' // Select the department's name
            }
        });

    if (!exam) {
        res.status(404); throw new Error("Exam not found.");
    }

    // --- DEFINITIVE AUTHORIZATION LOGIC ---
    const user = req.user; // The authenticated user (Teacher or HOD)

    // Condition 1: Is the user the teacher who created this exam?
    const isCreator = exam.createdBy.toString() === user._id.toString();

    // Condition 2: Is the user an HOD, AND does the exam belong to their department?
    const isHodOfDept =
        user.role === 'HOD' &&
        exam.semester?.department?._id.toString() === user.department.toString();

    // If NEITHER of these conditions is true, the user is not authorized.
    if (!isCreator && !isHodOfDept) {
        res.status(403);
        throw new Error("You are not authorized to view the results for this exam.");
    }
    // ------------------------------------

    // 3. If authorization passes, fetch the results.
    const results = await Result.find({ exam: req.params.examId })
        .populate('student', 'name collegeId')
        .sort({ score: -1 })
        .lean();

    res.json({
        exam: {
            _id: exam._id,
            title: exam.title,
            subject: exam.subject,
            totalMarks: exam.totalMarks
        },
        results
    });
});

const getMyResults = asyncHandler(async (req, res) => {
    // Find all results linked to the logged-in student's ID.
    const results = await Result.find({ student: req.user._id })
        // Populate the 'exam' field with the title and subject from the Exam collection.
        // This is crucial for displaying useful information to the student.
        .populate('exam', 'title subject')
        .select('exam score totalMarks createdAt status')
        .sort({ createdAt: -1 }); // Show the most recent results first.

    res.json(results);
});


// @desc    Update proctoring log for a result
// @route   POST /api/results/proctoring-log
// @access  Private/Student (The student's own app sends this)
const addProctoringLog = asyncHandler(async (req, res) => {
    const { examId, event } = req.body;
    const studentId = req.user._id;

    // Find or create a result entry for the ongoing exam
    let result = await Result.findOne({ exam: examId, student: studentId });
    if (!result) {
        // Create an 'ongoing' entry if one doesn't exist
        result = await Result.create({
            exam: examId,
            student: studentId,
            score: 0,
            totalMarks: 0, // Will be updated on submission
            answers: [],
            status: 'ongoing',
        });
    }

    result.proctoringLog.push({ event });
    await result.save();

    // In a real app, this would also emit a WebSocket event to the teacher's dashboard
    req.app.get('io').to(`exam_proctor_${examId}`).emit('proctoring_event', {
        studentId,
        studentName: req.user.name,
        event
    });

    res.status(200).json({ message: 'Log added' });
});

const getMyCompletedExams = asyncHandler(async (req, res) => {
    // Find all result documents for the current student
    const results = await Result.find({ student: req.user._id });

    // We only need to return the IDs of the exams they've taken
    const completedExamIds = results.map(result => result.exam.toString());

    res.json(completedExamIds);
});

const expelStudent = asyncHandler(async (req, res) => {
    const { examId } = req.body;
    const studentId = req.user._id;

    // Find the student's result document for this exam.
    // Use `findOneAndUpdate` to find and update in one atomic operation.
    const result = await Result.findOneAndUpdate(
        { exam: examId, student: studentId },
        // Set the status to 'expelled'.
        // We can also set the score to 0 or another penalty value.
        { status: 'expelled', score: 0, $push: { proctoringLog: { event: 'EXPELLED_BY_SYSTEM' } } },
        // Options:
        // `upsert: true` means if no result exists, create one. This is robust.
        // `new: true` means return the document AFTER the update.
        { upsert: true, new: true }
    );

    // We might not have a full 'exam' object here to get total marks, so we can omit it
    // if it's not strictly necessary for an expelled result.

    res.status(200).json({ message: 'Student has been marked as expelled.', result });
});


module.exports = { submitExam, getResultsForExam, addProctoringLog, getMyCompletedExams, getMyResults, expelStudent };