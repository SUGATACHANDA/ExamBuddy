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
    updateUserByHOD,
    deleteUserByHOD,
    getCoursesForHOD,
    getAllDepartmentExams,
    getExamsWithResults,
    bulkCSVUpload
} = require('../controllers/hodController');
const { getResultsForExam } = require('../controllers/resultController');
const upload = require("../middlewares/upload");
const uploadCSV = require('../middlewares/uploadCsv');

// Apply security middleware to all routes in this file
router.use(protect, authorize('HOD'));


// Register users
router.post('/users/register-student', upload.single("photo"), registerStudent);
router.post('/users/register-teacher', upload.none(), registerTeacher);

// Lists
router.get('/students', getStudentsInDepartment);
router.get('/teachers', getTeachersInDepartment);

// Update / Delete
router.route('/users/:id')
    .put(updateUserByHOD)
    .delete(deleteUserByHOD);
router.get('/my-courses', getCoursesForHOD);
router.get('/department-exams', getAllDepartmentExams);
router.get('/exams-with-results', getExamsWithResults);
router.get('/results/:examId', getResultsForExam);
router.post(
    "/users/bulk-upload",
    authorize('HOD'),      // your existing HOD auth middleware
    uploadCSV.single("file"),
    bulkCSVUpload
);
module.exports = router;
