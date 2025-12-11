// backend/controllers/teacherController.js
const asyncHandler = require('express-async-handler');
const Department = require('../models/Department');
const User = require('../models/User'); // We need the Department model

function normalizeFaceDescriptor(fd) {
    if (!fd) return [];
    if (Array.isArray(fd)) return fd;
    if (fd.data) return Array.from(fd.data);
    return [];
}


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

const getTeacherProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const teacher = await User.findById(id)
        .select("-password")
        .populate("college", "name")
        .populate("department", "name")
        .populate("degree", "name")
        .populate("course", "name")
        .populate("semester", "name");

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    res.json({
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        collegeId: teacher.collegeId,
        role: teacher.role,
        photoUrl: teacher.photoUrl || null,
        college: teacher.college || null,
        department: teacher.department || null,
        degree: teacher.degree || null,
        course: teacher.course || null,
        semester: teacher.semester || null,
        faceDescriptor: normalizeFaceDescriptor(teacher.faceDescriptor),
        createdAt: teacher.createdAt,
    });
});

module.exports = {
    getMyDepartments,
    getTeacherProfile
};