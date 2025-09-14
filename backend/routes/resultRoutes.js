// routes/resultRoutes.js
const express = require('express');
const router = express.Router();
const { submitExam, getResultsForExam, addProctoringLog, getMyCompletedExams, getMyResults, expelStudent } = require('../controllers/resultController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/submit', protect, authorize('student'), submitExam);
router.get('/exam/:examId', protect, authorize('teacher', 'HOD'), getResultsForExam);
router.post('/proctoring-log', protect, authorize('student'), addProctoringLog);
router.get('/my-completed', protect, authorize('student'), getMyCompletedExams);
router.get('/my-results', protect, authorize('student'), getMyResults);
router.post('/expel', protect, authorize('student'), expelStudent);

module.exports = router;