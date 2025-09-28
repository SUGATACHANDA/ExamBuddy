const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Token = require('../models/Token');
const generateToken = require('../utils/generateToken');
const PasswordResetEmail = require("../emails/PasswordResetEmail");
const PasswordResetSuccessEmail = require("../emails/PasswordResetSuccessEmail");

const crypto = require("crypto");
const { render } = require("@react-email/components");
const React = require("react");
const sendEmail = require("../utils/mailer");
const { generateOTP } = require("../utils/otp");
const PasswordResetOTPEmail = require('../emails/PasswordResetOTPEmail');


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

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // The `protect` middleware gives us `req.user`
    const user = await User.findById(req.user._id).select('+password');

    if (!user || !(await user.matchPassword(oldPassword))) {
        res.status(401);
        throw new Error('Invalid old password.');
    }

    // The pre-save hook on the User model will automatically hash this new password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
});


// --- 2. FORGOT PASSWORD (Step 1: Request a reset) ---
/**
 * @desc    Forgot password - send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('No user found with that email address.');
    }

    if (user.role === 'admin') {
        res.status(400);
        throw new Error('Password reset for admin is not allowed via this method.');
    }

    // Remove old tokens
    await Token.deleteMany({ userId: user._id });

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now() // optional TTL
    }).save();

    // Generate Electron deep link
    const resetUrl = `https://exam-buddy-indol.vercel.app?token=${resetToken}`;
    console.log("Reset URL for email:", resetUrl);

    // Render email HTML using React Email
    const html = PasswordResetEmail({ name: user.name, resetUrl });


    // Send email
    try {
        await sendEmail(user.email, 'Reset Your Password', html);
        console.log(`Password reset email sent to ${user.email}`);
    } catch (err) {
        console.error('Error sending email:', err);
        res.status(500);
        throw new Error('Failed to send password reset email.');
    }

    res.status(200).json({
        message: 'Password reset link has been sent to your email.'
    });
});

// --- 3. RESET PASSWORD (Step 2: Submit a new password) ---
const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;

    // Hash the token from the URL params to match the one in the DB
    const resetToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const token = await Token.findOne({ token: resetToken });

    if (!token) {
        res.status(400);
        throw new Error('Invalid or expired password reset token.');
    }

    const user = await User.findById(token.userId);
    if (!user) {
        res.status(400); throw new Error('User not found.');
    }

    user.password = password; // The pre-save hook will hash this
    await user.save();

    await token.deleteOne(); // The token has been used, delete it.

    const successEmailHtml = render(
        React.createElement(PasswordResetSuccessEmail, { user })
    );
    await sendEmail(user.email, "Your Password Has Been Reset", successEmailHtml);

    res.status(200).json({ message: 'Password has been reset successfully.' });
});

const requestPasswordResetOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("No user found with that email address.");
    }

    const now = new Date();
    if (user.resetOTPResendAfter && user.resetOTPResendAfter > now) {
        const waitSec = Math.ceil((user.resetOTPResendAfter - now) / 1000);
        res.status(429);
        throw new Error(`Please wait ${waitSec} seconds before resending OTP.`);
    }

    const otp = generateOTP();
    user.resetOTP = otp;
    user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min validity
    user.resetOTPResendAfter = new Date(Date.now() + 4 * 60 * 1000); // resend in 4 min
    await user.save();

    // Send OTP email
    const html = PasswordResetOTPEmail({ name: user.name, otp });
    await sendEmail(user.email, "Your OTP for Password Reset", html);

    res.status(200).json({ message: "OTP sent to your email.", resendTimer: 120, });
});

// STEP 2: Verify OTP
const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetOTP !== otp || !user.resetOTPExpiry || user.resetOTPExpiry < Date.now()) {
        res.status(400);
        throw new Error("Invalid or expired OTP.");
    }

    res.status(200).json({ message: "OTP verified successfully." });
});

// STEP 3: Reset Password
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || user.resetOTP !== otp || !user.resetOTPExpiry || user.resetOTPExpiry < Date.now()) {
        res.status(400);
        throw new Error("Invalid or expired OTP.");
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    user.resetOTPResendAfter = undefined;
    await user.save();

    const html = PasswordResetSuccessEmail({ name: user.name });
    await sendEmail(user.email, "Password Reset Confirmation", html);

    res.status(200).json({ message: "Password has been reset successfully." });
});
module.exports = { authUser, changePassword, resetPassword, forgotPassword, requestPasswordResetOTP, resetPasswordWithOTP, verifyPasswordResetOTP };