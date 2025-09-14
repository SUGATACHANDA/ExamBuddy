// backend/controllers/teacherController.js

const asyncHandler = require('express-async-handler');
const Department = require('../models/Department'); // We need the Department model

/**
 * @desc    Get the department(s) associated with the logged-in teacher.
 * @route   GET /api/teacher/my-departments
 * @access  Private/Teacher
 */
const getMyDepartments = asyncHandler(async (req, res) => {
    // The `req.user` object is populated by our `protect` middleware.
    // A teacher's user document has a `department` field which is an ObjectId.
    const teacherDepartmentId = req.user.department;

    if (!teacherDepartmentId) {
        // This case handles if a teacher was somehow created without a department.
        res.status(404);
        throw new Error('No department assigned to this teacher.');
    }

    // In this model, a teacher is assigned to one department.
    // We find that department and return it in an array to keep the API consistent.
    // If a teacher could belong to multiple departments, the logic would change here.
    const department = await Department.findById(teacherDepartmentId);

    if (!department) {
        res.status(404);
        throw new Error('Assigned department not found.');
    }

    // We return an array, because in the future a teacher might have multiple departments.
    res.json([department]);
});

module.exports = {
    getMyDepartments,
};