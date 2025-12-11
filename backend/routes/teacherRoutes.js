// backend/routes/teacherRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getMyDepartments, getTeacherProfile } = require('../controllers/teacherController');

// All routes in this file are for authenticated teachers.
router.use(protect, authorize('teacher'));

// Define the route for fetching the teacher's own department(s)
router.get('/my-departments', getMyDepartments);
router.get("/profile/:id", getTeacherProfile);

module.exports = router;