// routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const { createQuestion, getTeacherQuestions, updateQuestion, deleteQuestion, createBulkQuestions } = require('../controllers/questionController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const Question = require('../models/Question');

router.route('/')
    .post(protect, authorize('teacher'), createQuestion)
    .get(protect, authorize('teacher'), getTeacherQuestions);

router.route('/:id')
    .put(protect, authorize('teacher'), updateQuestion)
    .delete(protect, authorize('teacher'), deleteQuestion);


router.post("/bulk", protect, authorize('teacher'), createBulkQuestions);


module.exports = router;