// backend/routes/universityAffairsRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');

const {
    // Degree CRUD
    createDegree, getDegrees, getDegree, updateDegree, deleteDegree,
    // Course CRUD
    createCourse, getCourses, getCourse, updateCourse, deleteCourse,
    // Department CRUD
    createDepartment, getDepartments, getDepartment, updateDepartment, deleteDepartment,
    // Semester CRUD
    createSemester, getSemesters, getSemester, updateSemester, deleteSemester,
    // HOD Management
    registerHOD, getHODs, deleteHOD, updateHOD
} = require('../controllers/universityAffairsController');

// Secure all routes in this file for the 'university_affairs' role
router.use(protect, authorize('university_affairs'));

// --- HIERARCHY CRUD ROUTES (Full Implementation) ---

// -- DEGREES --
// Collection: /api/university-affairs/degrees
router.route('/degrees').post(createDegree).get(getDegrees);
// Individual Item: /api/university-affairs/degrees/:id
router.route('/degrees/:id').get(getDegree).put(updateDegree).delete(deleteDegree);

// -- COURSES --
router.route('/courses').post(createCourse).get(getCourses);
router.route('/courses/:id').get(getCourse).put(updateCourse).delete(deleteCourse);

// -- DEPARTMENTS --
router.route('/departments').post(createDepartment).get(getDepartments);
router.route('/departments/:id').get(getDepartment).put(updateDepartment).delete(deleteDepartment);

// -- SEMESTERS --
router.route('/semesters').post(createSemester).get(getSemesters);
router.route('/semesters/:id').get(getSemester).put(updateSemester).delete(deleteSemester);


// --- HOD MANAGEMENT ROUTES ---
router.post('/users/register-hod', registerHOD);
router.get('/users/hods', getHODs);
router.delete('/users/hod/:id', deleteHOD);
router.route('/users/hods/:id')
    .put(updateHOD)     // PUT    to /api/university-affairs/users/hods/:id
    .delete(deleteHOD);
// Note: PUT/DELETE for HODs is handled by the generic /api/admin/users/:id route

module.exports = router;