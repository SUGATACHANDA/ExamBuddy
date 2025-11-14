// controllers/resultController.js
const asyncHandler = require('express-async-handler');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Question = require('../models/Question');
const ExamResultEmail = require('../emails/ExamResultEmail');
const sendEmail = require('../utils/mailer');

/**
 * @desc    Submit an exam for final evaluation
 * @route   POST /api/results/submit
 * @access  Private/Student
 */
const submitExam = asyncHandler(async (req, res) => {
    const { examId, answers: studentAnswersRaw } = req.body;
    const studentId = req.user._id;

    // Ensure answers is an array
    const studentAnswers = Array.isArray(studentAnswersRaw) ? studentAnswersRaw : [];

    // Fetch exam with full question details
    const exam = await Exam.findById(examId)
        .populate({
            path: "sections.questions",
            select: "questionType correctAnswer correctAnswers expectedAnswer marks"
        })
        .populate({ path: "subject", select: "name" });

    if (!exam) {
        res.status(404);
        throw new Error("Exam not found.");
    }

    // Build a map of question details
    const questionMap = new Map();
    exam.sections.forEach(section => {
        section.questions.forEach(q => {
            questionMap.set(q._id.toString(), {
                questionType: q.questionType,
                correctAnswer: q.correctAnswer,
                correctAnswers: q.correctAnswers || [],
                expectedAnswer: q.expectedAnswer,
                marks: q.marks || 1
            });
        });
    });

    let score = 0;
    let totalMarks = 0;
    questionMap.forEach(q => totalMarks += q.marks);

    // Evaluate answers
    studentAnswers.forEach(ans => {
        if (ans.status === "answered" || ans.status === "answeredAndMarked") {
            const q = questionMap.get(ans.questionId);
            if (!q) return;

            // ✅ MCQ
            if (q.questionType === "mcq") {
                if (ans.submittedAnswer === q.correctAnswer) {
                    score += q.marks;
                }
            }

            // ✅ MULTIPLE SELECT
            else if (q.questionType === "multiple_select") {
                const correctAnswers = q.correctAnswers;
                const submitted = Array.isArray(ans.submittedAnswer)
                    ? ans.submittedAnswer
                    : [ans.submittedAnswer];

                if (correctAnswers.length > 0) {
                    const marksPerOption = q.marks / correctAnswers.length;
                    let earned = 0;
                    submitted.forEach(option => {
                        if (correctAnswers.includes(option)) {
                            earned += marksPerOption;
                        }
                    });
                    score += parseFloat(earned.toFixed(2)); // rounded 2 decimals
                }
            }

            // ✅ SHORT ANSWER
            else if (q.questionType === "short_answer") {
                if (
                    ans.submittedAnswer &&
                    q.expectedAnswer &&
                    ans.submittedAnswer.trim().toLowerCase() ===
                    q.expectedAnswer.trim().toLowerCase()
                ) {
                    score += q.marks;
                }
            }
        }
    });

    // ✅ Save final result
    const finalResult = await Result.findOneAndUpdate(
        { exam: examId, student: studentId },
        {
            exam: examId,
            subject: exam.subject,
            student: studentId,
            score,
            totalMarks,
            answers: studentAnswers.map((a) => ({
                questionId: a.questionId,
                submittedAnswer: Array.isArray(a.submittedAnswer)
                    ? a.submittedAnswer
                    : [a.submittedAnswer].filter(Boolean),
                status: a.status || "answered",
                awardedMarks:
                    typeof a.awardedMarks === "number"
                        ? a.awardedMarks
                        : a.isCorrect
                            ? a.marks || 0
                            : 0, // ✅ Save marks explicitly
            })),
            status: "completed",
        },
        { upsert: true, new: true }
    );

    // ✅ Email notification
    const student = await User.findById(studentId);
    if (student) {
        const percentage = ((score / totalMarks) * 100).toFixed(2);
        const status = percentage >= 40 ? "Pass" : "Fail";

        const html = ExamResultEmail({
            name: student.name,
            examTitle: exam.title,
            score,
            total: totalMarks,
            percentage,
            status,
            subject: exam.subject?.name || ''
        });

        try {
            await sendEmail(student.email, `Results published for ${exam.title}`, html);
        } catch (err) {
            console.error("Email send failed:", err);
        }
    }

    res.status(201).json({
        message: "Exam submitted successfully!",
        result: finalResult
    });
});



/**
 * @desc    Save the student's current progress without submitting for final evaluation.
 * @route   PUT /api/results/progress
 * @access  Private/Student
 */
const saveProgress = asyncHandler(async (req, res) => {
    const { examId, answers } = req.body;
    const studentId = req.user._id;

    const result = await Result.findOneAndUpdate(
        { exam: examId, student: studentId },
        { answers: answers, status: 'ongoing' }, // Update the entire answers array
        { upsert: true, new: true, runValidators: true } // Upsert: Create if it doesn't exist
    );

    res.status(200).json({ message: 'Progress saved successfully.' });
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
        .populate("subject", "name")
        .sort({ score: -1 })
        .lean();

    res.json({
        exam: {
            _id: exam._id,
            title: exam.title,
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
        .populate("subject", "name")
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

// controllers/resultController.js

const getResultDetails = asyncHandler(async (req, res) => {
    const resultId = req.params.id;

    // ✅ Find result and populate all necessary fields
    const result = await Result.findById(resultId)
        .populate({
            path: "exam",
            populate: { path: "subject", select: "name" },
        })
        .populate("subject", "name")
        .populate("student", "name collegeId")
        .populate({
            path: "answers.questionId",
            model: "Question",
            select: "questionText questionType correctAnswer correctAnswers expectedAnswer marks options",
        });

    if (!result) {
        return res.status(404).json({ message: "Result not found" });
    }

    // ✅ Format answers for frontend
    const formattedAnswers = result.answers.map((ans) => {
        const q = ans.questionId;

        if (!q) {
            return {
                questionText: "Question not found",
                options: [],
                correctAnswer: null,
                correctAnswers: [],
                selectedOption: ans.submittedAnswer || null,
                isCorrect: false,
                awardedMarks: ans.awardedMarks ?? awardedMarks,
                questionMarks: 0,
                questionType: "N/A",
            };
        }

        // ✅ Normalize arrays
        const options = Array.isArray(q.options) ? q.options : [];
        const correctAnswers = Array.isArray(q.correctAnswers)
            ? q.correctAnswers
            : q.correctAnswer
                ? [q.correctAnswer]
                : [];

        const selectedOptions = Array.isArray(ans.submittedAnswer)
            ? ans.submittedAnswer
            : ans.submittedAnswer
                ? [ans.submittedAnswer]
                : [];

        // ✅ Scoring logic based on question type
        let isCorrect = false;
        let awardedMarks = 0;

        if (q.questionType === "multiple_select" && correctAnswers.length > 0) {
            const correctSelected = selectedOptions.filter((opt) =>
                correctAnswers.includes(opt)
            ).length;
            awardedMarks = parseFloat(
                ((correctSelected / correctAnswers.length) * q.marks).toFixed(2)
            );
            isCorrect = correctSelected === correctAnswers.length;
        }
        else if (q.questionType === "mcq") {
            const chosen = selectedOptions[0]?.trim().toLowerCase();
            const correct =
                (q.correctAnswer || correctAnswers[0] || "").trim().toLowerCase();

            isCorrect = chosen === correct;
            awardedMarks = isCorrect ? Number(q.marks) : 0;
        }
        else if (q.questionType === "short_answer") {
            const studentAnswer = selectedOptions[0]?.trim().toLowerCase();
            const expected = q.expectedAnswer?.trim().toLowerCase();
            isCorrect = studentAnswer === expected;
            awardedMarks = isCorrect ? q.marks : 0;
        }

        return {
            questionText: q.questionText || "Question not found",
            options,
            correctAnswer: q.correctAnswer || null,
            correctAnswers,
            selectedOption: ans.submittedAnswer,
            questionType: q.questionType || "mcq",
            questionMarks: q.marks || 1,
            expectedAnswer: q.expectedAnswer || "",
            isCorrect,
            awardedMarks: ans.awardedMarks ?? awardedMarks,
            status: ans.status || "unanswered",
        };
    });

    // ✅ Send response
    res.json({
        _id: result._id,
        exam: {
            title: result.exam?.title,
            subject: result.exam?.subject?.name || "N/A",
        },
        subject: result.subject?.name || "N/A",
        student: result.student,
        score: result.score,
        totalMarks: result.totalMarks,
        answers: formattedAnswers,
        createdAt: result.createdAt,
    });
});



module.exports = { submitExam, saveProgress, getResultsForExam, addProctoringLog, getMyCompletedExams, getMyResults, expelStudent, getResultDetails };