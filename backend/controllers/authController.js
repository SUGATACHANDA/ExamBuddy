const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Authenticate a user (student, teacher, or admin) & get a JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const authUser = asyncHandler(async (req, res) => {
    const { collegeId, password } = req.body;

    // 1. Basic Validation: Ensure credentials were sent.
    if (!collegeId || !password) {
        res.status(400);
        throw new Error('Please provide both a College ID and a password.');
    }

    console.log(`Login attempt for College ID: ${collegeId}`);
    const user = await User.findOne({ collegeId }).select('+password');
    if (user && (await user.matchPassword(password))) {
        // Login Successful
        console.log(`SUCCESS: User '${user.name}' (${user.role}) authenticated successfully.`);

        await user.populate('college', 'name');
        await user.populate('department', 'name');

        // --- THIS IS THE CRITICAL FIX ---
        // If the user is a student, we MUST also populate their semester.
        if (user.role === 'student') {
            await user.populate('degree', 'name');
            await user.populate('course', 'name');
            await user.populate('semester', 'number'); // Populate the semester details
        }

        // 4. Generate a JWT token and send back the user data.
        // The frontend will use this data to direct the user and store auth state.
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            collegeId: user.collegeId,
            role: user.role,
            college: user.college,
            degree: user.degree,
            course: user.course,
            department: user.department,
            semester: user.semester,

            // Include other necessary fields based on role if needed in the future
            token: generateToken(user._id, user.role), // Token is generated here
        });

    } else {
        // Login Failed
        console.warn(`FAILED LOGIN: Invalid credentials for College ID: ${collegeId}`);
        res.status(401); // 401 Unauthorized is the correct status code for bad credentials.
        throw new Error('Invalid College ID or password.');
    }
});
module.exports = { authUser };