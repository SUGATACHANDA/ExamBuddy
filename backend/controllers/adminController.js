const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const College = require('../models/College');

// =======================================================
// COLLEGE MANAGEMENT (Full CRUD)
// =======================================================

/** @desc    Create a new College */
/** @route   POST /api/admin/colleges */
exports.createCollege = asyncHandler(async (req, res) => {
    const { name, location } = req.body;
    if (!name || !location) {
        res.status(400);
        throw new Error('College name and location are required.');
    }
    // Check if college already exists
    const collegeExists = await College.findOne({ name });
    if (collegeExists) {
        res.status(400);
        throw new Error('A college with this name already exists.');
    }
    const college = await College.create({ name, location });
    res.status(201).json(college);
});

/** @desc    Get all Colleges */
/** @route   GET /api/admin/colleges */
exports.getColleges = asyncHandler(async (req, res) => {
    const colleges = await College.find({}).sort({ name: 1 });
    res.json(colleges);
});

/** @desc    Get a single College by ID */
/** @route   GET /api/admin/colleges/:id */
exports.getCollege = asyncHandler(async (req, res) => {
    const college = await College.findById(req.params.id);
    if (!college) {
        res.status(404);
        throw new Error('College not found.');
    }
    res.json(college);
});

/** @desc    Update a College by ID */
/** @route   PUT /api/admin/colleges/:id */
exports.updateCollege = asyncHandler(async (req, res) => {
    const college = await College.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });
    if (!college) {
        res.status(404);
        throw new Error('College not found.');
    }
    res.json(college);
});

/** @desc    Delete a College by ID */
/** @route   DELETE /api/admin/colleges/:id */
exports.deleteCollege = asyncHandler(async (req, res) => {
    const college = await College.findById(req.params.id);
    if (!college) {
        res.status(404);
        throw new Error('College not found.');
    }
    // Note: In a real-world scenario, you would first delete all children (degrees, courses, users, etc.)
    await college.deleteOne();
    res.json({ message: 'College removed successfully.' });
});


// =======================================================
// USER MANAGEMENT
// =======================================================

/** @desc    Register a University Affairs user */
/** @route   POST /api/admin/users/register-ua */
exports.registerUniversityAffairs = asyncHandler(async (req, res) => {
    const { collegeId, name, email, password, college } = req.body;
    if (!collegeId || !name || !email || !password || !college) {
        res.status(400); throw new Error('Please provide all required fields.');
    }
    const userExists = await User.findOne({ $or: [{ email }, { collegeId }] });
    if (userExists) { res.status(400); throw new Error('User with this email or ID already exists.'); }

    const user = await User.create({
        collegeId, name, email, password, college,
        role: 'university_affairs' // Role is hard-coded for security
    });

    if (user) {
        res.status(201).json({ _id: user._id, name: user.name, email: user.email });
    } else {
        res.status(400); throw new Error('Invalid user data provided.');
    }
});

/**
 * @desc    Get all users of a specific role
 * @route   GET /api/admin/users/:role
 * @access  Private/Admin
 */
exports.getUsersByRole = asyncHandler(async (req, res) => {
    const role = req.params.role;
    const validRoles = ['student', 'teacher', 'HOD', 'university_affairs'];
    if (!validRoles.includes(role)) {
        res.status(400); throw new Error(`Invalid role specified.`);
    }

    // --- THIS IS THE DEFINITIVE FIX ---
    // Start building the Mongoose query.
    let query = User.find({ role: role });

    // Conditionally add the `.populate()` based on the role.
    // Only students, teachers, and HODs have a 'department' field to populate.
    if (['student', 'teacher', 'HOD'].includes(role)) {
        query = query.populate('department', 'name');
    }

    // Always populate college, as all roles have it.
    query = query.populate('college', 'name');

    // Always exclude the password.
    query = query.select('-password');

    // Now, execute the fully constructed query.
    const users = await query;
    // ------------------------------------

    res.json(users);
});

/** @desc    Update any user's core details (except Admin) */
/** @route   PUT /api/admin/users/:id */
exports.updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found.'); }

    // An admin cannot edit another admin through this route for safety
    if (user.role === 'admin') {
        res.status(400); throw new Error('Admin accounts cannot be modified via this route.');
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.collegeId = req.body.collegeId || user.collegeId;

    // Additional logic to prevent creating duplicates when editing
    const duplicate = await User.findOne({
        _id: { $ne: req.params.id }, // not the same user
        $or: [{ email: user.email }, { collegeId: user.collegeId }]
    });
    if (duplicate) { res.status(400); throw new Error('Email or College ID is already taken.'); }

    const updatedUser = await user.save();
    res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email });
});

/** @desc    Delete any user (except Admin) */
/** @route   DELETE /api/admin/users/:id */
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404); throw new Error('User not found.'); }

    if (user.role === 'admin') {
        res.status(400); throw new Error('Admin accounts cannot be deleted.');
    }

    // Note: In production, also delete any results, questions, etc. created by this user.
    await user.deleteOne();
    res.json({ message: 'User removed successfully.' });
});