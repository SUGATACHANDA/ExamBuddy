// backend/routes/examRoutes.js

const express = require('express');
const router = express.Router();

const {
    createExam,
    getMyExams,
    getExamForStudent,
    getAvailableExamsForStudent,
    updateExam,
    deleteExam
} = require('../controllers/examController');

const { protect, authorize } = require('../middlewares/authMiddleware');


// --- Teacher-specific routes for general exam management ---
// GET /api/exams/ and POST /api/exams/
router.route('/')
    .post(protect, authorize('teacher'), createExam)
    .get(protect, authorize('teacher'), getMyExams);


// --- Student-specific routes ---

// GET /api/exams/student/all
// This gets the list of exams for the student's dashboard.
router.get('/student/all', protect, authorize('student'), getAvailableExamsForStudent);

// --- THIS IS THE CRUCIAL FIX ---
// The specific route /start/:id MUST be defined BEFORE the general /:id route.
// GET /api/exams/start/:id
// This is the endpoint the student hits to begin the exam security checks.
router.get('/start/:id', protect, authorize('student'), getExamForStudent);
// ---------------------------------


// --- Teacher routes for a SPECIFIC exam ---
// These routes handle actions on a single exam identified by its ID.
// GET, PUT, and DELETE /api/exams/:id
router.route('/:id')
    .put(protect, authorize('teacher'), updateExam)
    .delete(protect, authorize('teacher'), deleteExam);

// Note: The original `.get()` on this route was for students,
// but the `/start/:id` route is a much clearer and less ambiguous endpoint for that purpose.
// If you need a teacher to be able to get a single exam's details, you could add:
// .get(protect, authorize('teacher'), getSingleExamForTeacher)

module.exports = router;