// backend/controllers/examController.js
const asyncHandler = require('express-async-handler');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Question = require('../models/Question');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { default: mongoose } = require('mongoose');
const ExamNotificationEmail = require('../emails/ExamNotificationEmail');
const sendEmail = require('../utils/mailer');
const { DateTime } = require("luxon");

// @desc    Create a new exam
// @route   POST /api/exams
// @access  Private/Teacher
/**
 * @desc    Create a new exam with a section-based structure
 * @route   POST /api/exams
 * @access  Private/Teacher, Private/HOD
 */
const createExam = asyncHandler(async (req, res) => {
    const {
        title,
        subject,
        semester,
        scheduledAt,
        timeZone,
        examType,
        duration,
        sections,
        enableCameraProctoring = false,
        enableAudioProctoring = false,
        enableFaceVerification
    } = req.body;
    // --- Validation ---
    if (!title || !semester || !scheduledAt || !sections || !Array.isArray(sections)) {
        res.status(400);
        throw new Error('Please provide all required exam details, including sections.');
    }
    if (sections.length === 0 || sections.some(sec => sec.questions.length === 0)) {
        res.status(400);
        throw new Error('Exam must have at least one section, and each section must have at least one question.');
    }

    // Security check: Make sure all question IDs belong to the current teacher
    // (This is an advanced check, for now we trust the frontend)

    // Construct the payload for the new exam

    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
        res.status(404);
        throw new Error("Subject not found");
    }

    const utcDate = DateTime.fromISO(scheduledAt, { zone: timeZone }).toUTC().toJSDate();
    const examPayload = {
        title,
        subject: new mongoose.Types.ObjectId(subject),
        semester,
        sections, // The sections array is passed directly
        createdBy: req.user._id,
        scheduledAt: utcDate,
        timeZone: timeZone,
        duration,
        examType,
        enableCameraProctoring,
        enableAudioProctoring,
        enableFaceVerification: enableFaceVerification || false,
    };

    const createdExam = await Exam.create(examPayload);
    const sendExamNotificationEmail = async (student, exam) => {
        const now = new Date();
        const start = new Date(exam.startTime);
        const hoursLeft = Math.ceil((start - now) / (1000 * 60 * 60));

        const html = await ExamNotificationEmail({
            name: student.name,
            examTitle: exam.title,
            subject: subjectDoc.name,
            startTime: exam.scheduledAt,
            duration: exam.duration,
            examId: exam._id,
            timeZone: exam.timeZone
        });

        await sendEmail(student.email, `Upcoming Assessment – ${exam.title} • ${subjectDoc.name} • ${duration} Minutes • Starts: ${startTime}`, html);
    };
    const students = await User.find({ semester, role: "student" });

    if (students.length > 0) {
        // Notify all students now
        for (const student of students) {
            await sendExamNotificationEmail(student, createdExam, Math.ceil((new Date(createdExam.scheduledAt) - new Date()) / (1000 * 60 * 60)));
        }
    }
    res.status(201).json(createdExam);
});

// @desc    Get exams created by a teacher
// @route   GET /api/exams
// @access  Private/Teacher
const getMyExams = asyncHandler(async (req, res) => {
    // This query now returns lean JavaScript objects and adds a `questionCount` field.
    const exams = await Exam.find({ createdBy: req.user._id })
        .populate("subject", "name")
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
/**
 * @desc    Get a single exam for a student to begin, with full validation and deep population.
 * @route   GET /api/exams/:id
 * @access  Private/Student
 */
const getExamForStudent = asyncHandler(async (req, res) => {
    // --- 1. PRELIMINARY VALIDATION ---

    // Get the currently authenticated student from the `protect` middleware
    const student = await User.findById(req.user._id);
    if (!student) {
        res.status(401);
        throw new Error("Student not found or not authenticated.");
    }

    // --- 2. CHECK FOR PREVIOUS ATTEMPTS (MOST IMPORTANT SECURITY CHECK FIRST) ---
    // const existingExpelledResult = await Result.findOne({
    //     exam: req.params.id,
    //     student: student._id,
    //     status: 'expelled',
    // });

    // if (existingExpelledResult.status === "expelled") {
    //     return res.status(403).json({
    //         message: "You have been expelled from this exam and cannot re-enter.",
    //     });
    // }
    // --- 3. FETCH & DEEPLY POPULATE THE EXAM DATA ---
    // This is the definitive fix for the frontend Palette rendering bug.
    // It populates the nested 'questions' array within each section.
    const exam = await Exam.findById(req.params.id)
        .populate({
            path: 'sections.questions',
            model: 'Question',
            // CRITICAL: For security, never send the correct answer to the student's browser.
            select: '-correctAnswer'
        }).populate("subject", "name");

    if (!exam) {
        res.status(404);
        throw new Error('Exam not found.');
    }
    // --- 4. HIERARCHICAL VALIDATION ---
    // Ensure the student is actually enrolled in the semester this exam is for.
    if (!student.semester || exam.semester.toString() !== student.semester.toString()) {
        res.status(403);
        throw new Error("Access Denied: You are not enrolled in the required semester for this exam.");
    }

    // --- 5. TIME WINDOW VALIDATION ---
    // Check if the current time is within the allowed login window.
    const now = new Date();
    const scheduledTime = new Date(exam.scheduledAt);
    const windowStartTime = new Date(scheduledTime.getTime() - (exam.loginWindowStart || 10) * 60000); // Defaults to 10 min before
    const windowEndTime = new Date(scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000);   // Defaults to 5 min after

    const totalMarks = exam.sections.reduce((total, section) => total + section.questions.length, 0);

    await Result.findOneAndUpdate(
        { exam: req.params.id, student: student._id },
        {
            $setOnInsert: { // These fields are only set when the document is first created
                status: 'ongoing',
                exam: req.params.id,
                student: student._id,
                totalMarks: totalMarks,
                answers: [], // Start with an empty answers array
                score: 0,
            }
        },
        { upsert: true } // If no document matches, create it.
    );

    const existingResult = await Result.findOne({
        exam: req.params.id,
        student: student._id,
        // status: 'ongoing',
    });

    if (existingResult) {
        // If a result exists, the student has either completed the exam or was expelled. Deny access.
        res.status(403); // 403 Forbidden is the correct status code for authorization failure.

        if (existingResult.status === 'expelled') {
            throw new Error('You were previously expelled from this exam and cannot re-enter.');
        }
    }


    if (existingResult) {
        console.log(`[ExamController] Student ${student._id} already has ongoing exam — skipping late login restriction.`);
    } else {
        if (now < windowStartTime) {
            res.status(403);
            throw new Error(
                `The login window for this exam has not opened yet. Please try again after ${windowStartTime.toLocaleTimeString()}.`
            );
        }

        if (now > windowEndTime) {
            res.status(403);
            throw new Error(
                `The login window for this exam has closed. Entry was allowed until ${windowEndTime.toLocaleTimeString()}.`
            );
        }
    }

    // --- 6. SUCCESS ---
    // If all validation checks pass, send the fully populated exam data to the student.
    res.status(200).json(exam);
});

// @desc    Get all exams for a student to view
// @route   GET /api/exams/student/all
// @access  Private/Student
/**
 * @desc    Get all upcoming AND currently active exams for the logged-in student.
 * @route   GET /api/exams/student/all
 * @access  Private/Student
 */
const getAvailableExamsForStudent = asyncHandler(async (req, res) => {
    // 1. Get the authenticated student's data.
    // We re-fetch the user to ensure we have the most up-to-date semester assignment.
    const student = await User.findById(req.user._id);

    // If the student doesn't exist or isn't assigned to a semester, they can't take any exams.
    if (!student || !student.semester) {
        return res.json([]);
    }

    // Get the student's semester ID as a string for querying.
    const studentSemesterIdString = student.semester.toString();

    // 2. Perform a single, efficient database query.
    // This tells MongoDB to ONLY find exams that match the student's semester.
    // This is vastly more performant than fetching all exams and filtering in code.
    const examsForSemester = await Exam.find({ semester: studentSemesterIdString })
        .sort({ scheduledAt: 'asc' }) // Sort by the soonest starting exams first.
        .lean().populate("subject", "name"); // Use .lean() for a significant performance boost.

    // 3. Filter the results in-memory based on the current time.
    // This logic is for determining which exams are "upcoming" vs "active".
    const now = new Date();

    const upcomingAndActiveExams = examsForSemester.filter(exam => {
        // Calculate the absolute end time of the login window for this exam.
        const scheduledTime = new Date(exam.scheduledAt);
        const windowEndTime = new Date(scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000); // Defaults to 5 minutes after

        // Only return exams whose login window has not permanently closed yet.
        return now < windowEndTime;
    });

    // Add a simple log for monitoring in production.
    console.log(`Found ${upcomingAndActiveExams.length} available exams for student ${student.name}`);

    // 4. Send the final, filtered list to the frontend.
    res.json(upcomingAndActiveExams);
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