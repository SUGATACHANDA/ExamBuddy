// backend/controllers/examController.js
const asyncHandler = require('express-async-handler');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Question = require('../models/Question');
const User = require('../models/User');
const { default: mongoose } = require('mongoose');

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
const createExam = asyncHandler(async (req, res) => {
    const { title, questionIds, scheduledAt, duration, examType, subject, semester } = req.body;

    // Use the UTC-converted date from the frontend
    const scheduledAtUTC = new Date(scheduledAt);

    // Validate questions belong to the teacher's subject (optional: allow manual subject)
    const questions = await Question.find({ '_id': { $in: questionIds } });

    if (questions.length !== questionIds.length) {
        res.status(400);
        throw new Error('Some question IDs are invalid.');
    }

    const exam = new Exam({
        title,
        subject: subject || req.user.subject, // ✅ allow from body or fallback
        semester: new mongoose.Types.ObjectId(semester),                            // ✅ include semester
        questions: questionIds,
        createdBy: req.user._id,
        scheduledAt: scheduledAtUTC,
        duration,
        examType
    });

    const createdExam = await exam.save();
    res.status(201).json(createdExam);
});

// @desc    Get exams created by a teacher
// @route   GET /api/exams
// @access  Private/Teacher
const getMyExams = asyncHandler(async (req, res) => {
    // This query now returns lean JavaScript objects and adds a `questionCount` field.
    const exams = await Exam.find({ createdBy: req.user._id })
        .lean() // Makes queries faster
        .sort({ scheduledAt: -1 }); // Sort by most recent

    // Add the questionCount to each exam object safely.
    const examsWithCount = exams.map(exam => ({
        ...exam,
        questionCount: exam.questions ? exam.questions.length : 0
    }));

    res.json(examsWithCount);
});

// @desc    Get exam details for a student to start, with strict time validation
// @route   GET /api/exams/start/:id
// @access  Private/Student
const getExamForStudent = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id).populate('questions', '-correctAnswer');

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found');
    }

    const studentId = req.user._id; // Get the logged-in student's ID
    const existingResult = await Result.findOne({ exam: req.params.id, student: studentId });

    if (existingResult) {
        // If a result exists, the student has already taken the exam. Deny access.
        res.status(403); // 403 Forbidden is the appropriate status code.
        throw new Error('You have already submitted this exam and cannot retake it.');
    }

    const now = new Date();
    const scheduledTime = new Date(exam.scheduledAt);
    const windowStartTime = new Date(scheduledTime.getTime() - exam.loginWindowStart * 60000);
    const windowEndTime = new Date(scheduledTime.getTime() + exam.lateEntryWindowEnd * 60000);

    if (now < windowStartTime) {
        res.status(403);
        throw new Error(`The login window has not opened yet. Please try again after ${windowStartTime.toLocaleTimeString()}`);
    }

    if (now > windowEndTime) {
        res.status(403);
        throw new Error(`The login window for this exam has closed. Entry was allowed until ${windowEndTime.toLocaleTimeString()}`);
    }

    res.json(exam);
});

// @desc    Get all exams for a student to view
// @route   GET /api/exams/student/all
// @access  Private/Student
const getAvailableExamsForStudent = asyncHandler(async (req, res) => {
    const student = await User.findById(req.user._id);
    if (!student || !student.semester) {
        return res.json([]);
    }
    const studentSemesterIdString = student.semester.toString();

    // Fetch ALL exams. This is fine.
    const allExamsInDb = await Exam.find({});

    console.log(`[DEBUG] Found ${allExamsInDb.length} total exams in DB. Checking against student's semester ID: ${studentSemesterIdString}`);

    // --- THIS IS THE DEFINITIVE FIX ---
    // We will now filter out any exam that doesn't have a semester field.
    const examsForThisStudentSemester = allExamsInDb.filter(exam => {
        // 1. First, check if the exam document even has a semester. If not, it's invalid.
        if (!exam.semester) {
            console.log(`[DEBUG] SKIPPING Exam: "${exam.title}" because it has NO semester field.`);
            return false; // Exclude this corrupted exam
        }

        // 2. Now, we can safely call .toString()
        const examSemesterIdString = exam.semester.toString();
        const isMatch = examSemesterIdString === studentSemesterIdString;

        // (Optional: keep logging for confirmation)
        if (!isMatch) {
            console.log(`[DEBUG] SKIPPING Exam: "${exam.title}". Mismatched Semester ID (${examSemesterIdString})`);
        }

        return isMatch;
    });
    // ------------------------------------------

    console.log(`[DEBUG] Found ${examsForThisStudentSemester.length} exams matching student's semester.`);

    // Time window filtering (this part is correct)
    const now = new Date();
    const availableExams = examsForThisStudentSemester.filter(exam => {
        const scheduledTime = new Date(exam.scheduledAt);
        const windowStartTime = new Date(scheduledTime.getTime() - (exam.loginWindowStart || 10) * 60000);
        const windowEndTime = new Date(scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000);
        return now >= windowStartTime && now <= windowEndTime;
    });

    console.log(`[DEBUG] Found ${availableExams.length} exams in the current login window.`);

    res.json(availableExams);
});

const updateExam = asyncHandler(async (req, res) => {
    const { title, scheduledAt, examType, duration } = req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found.');
    }

    // Authorization check: ensure the teacher updating the exam is the one who created it.
    if (exam.createdBy.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized to update this exam.');
    }

    // Update the fields
    exam.title = title || exam.title;
    exam.scheduledAt = scheduledAt || exam.scheduledAt;
    exam.examType = examType || exam.examType;

    // Conditionally update duration. Set to undefined if exam is untimed.
    if (examType === 'timed') {
        exam.duration = duration || exam.duration;
    } else {
        exam.duration = undefined;
    }

    const updatedExam = await exam.save();
    res.json(updatedExam);
});


/**
 * @desc    Delete an exam and all its associated results
 * @route   DELETE /api/exams/:id
 * @access  Private/Teacher
 */
const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found.');
    }

    // Authorization check: ensure the teacher deleting the exam is the one who created it.
    if (exam.createdBy.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized to delete this exam.');
    }

    // --- CASCADING DELETE ---
    // Before deleting the exam, we must delete all result/submission records associated with it.
    await Result.deleteMany({ exam: req.params.id });

    // Now, delete the exam itself
    await exam.deleteOne(); // Use deleteOne()

    res.json({ message: 'Exam and all associated results removed.' });
});


// ----- CORRECTED EXPORTS -----
// This is the clean, standard way to export all functions from a controller.
module.exports = {
    createExam,
    getMyExams,
    getExamForStudent,
    getAvailableExamsForStudent,
    updateExam,
    deleteExam
};