const express = require('express');
const router = express.Router();

// --- Middleware Imports ---
// `protect` checks for a valid JWT token.
// `authorize` checks if the token's role matches the allowed roles.
const { protect, authorize } = require('../middlewares/authMiddleware');

// --- Controller Imports ---
// Import all the necessary controller functions from the single, authoritative adminController.
const {
    // User Management Functions
    registerUniversityAffairs, // Admins can now ONLY create this specific role
    getUsersByRole,
    updateUser,
    deleteUser,

    // College Management Functions (Full CRUD)
    createCollege,
    getColleges,
    getCollege,
    updateCollege,
    deleteCollege,
} = require('../controllers/adminController');


// =====================================================================================
// ==                           APPLY SECURITY MIDDLEWARE                             ==
// This is the most important line in the file. It secures all subsequent routes.
router.use(protect, authorize('admin'));
// =====================================================================================


// --- COLLEGE MANAGEMENT ROUTES (Top-level of the hierarchy) ---

// Path: /api/admin/colleges
router.route('/colleges')
    .get(getColleges)       // Admin gets a list of all colleges.
    .post(createCollege);      // Admin creates a new college.

// Path: /api/admin/colleges/:id
router.route('/colleges/:id')
    .get(getCollege)        // Admin gets details of a single college.
    .put(updateCollege)       // Admin updates a college's details.
    .delete(deleteCollege);    // Admin deletes a college.


// --- USER MANAGEMENT ROUTES ---

// Path: /api/admin/users/register-ua
// This is the specific endpoint for creating only University Affairs users.
router.post('/users/register-ua', registerUniversityAffairs);

// Path: /api/admin/users/:role
// This is a powerful, generic endpoint for an admin to view a list of any type of user.
// e.g., /api/admin/users/student, /api/admin/users/teacher, /api/admin/users/HOD, etc.
router.get('/users/:role', getUsersByRole);

// Path: /api/admin/users/:id
// Generic endpoints for an Admin to update or delete any user (except another Admin).
router.route('/users/:id')
    .put(updateUser)
    .delete(deleteUser);


module.exports = router;