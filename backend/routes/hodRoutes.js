// backend/routes/hodRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');

// Import all controller functions for the HOD role
const {
    registerStudent,
    registerTeacher,
    getStudentsInDepartment,
    getTeachersInDepartment,
    // getUserByHOD,
    updateUserByHOD,
    // updateUserPasswordByHOD,
    deleteUserByHOD,
    // getCoursesInCollege,
    // getCollegeCoursesForHOD,
    getCoursesForHOD,
    getAllDepartmentExams,
    getExamsWithResults,
    get
} = require('../controllers/hodController');
const { getResultsForExam } = require('../controllers/resultController');

// Apply security middleware to all routes in this file
router.use(protect, authorize('HOD'));

// --- User Management Routes (All scoped to the HOD's own department) ---

// Register users
router.post('/users/register-student', registerStudent);
router.post('/users/register-teacher', registerTeacher);

// Lists
router.get('/students', getStudentsInDepartment);
router.get('/teachers', getTeachersInDepartment);

// Single user (read)
// router.get('/users/:id', getUserByHOD);

// Update / Delete
router.route('/users/:id')
    .put(updateUserByHOD)
    .delete(deleteUserByHOD);

// Password update (dedicated endpoint)
// router.put('/users/:id/password', updateUserPasswordByHOD);

// router.get('/courses-in-college', getCoursesInCollege);
// router.get('/college-courses', getCollegeCoursesForHOD);
router.get('/my-courses', getCoursesForHOD);
router.get('/department-exams', getAllDepartmentExams);
router.get('/exams-with-results', getExamsWithResults);
router.get('/results/:examId', getResultsForExam);
module.exports = router;
