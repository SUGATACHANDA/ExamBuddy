// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authUser, changePassword, resetPassword, forgotPassword, requestPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithOTP } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/User');

router.post('/login', authUser);
router.put('/change-password', protect, changePassword); // Logged-in users only
router.post('/forgot-password', forgotPassword); // Public
router.put('/reset-password/:token', resetPassword);
router.post("/request-otp", requestPasswordResetOTP);
router.post("/verify-otp", verifyPasswordResetOTP);
router.post("/reset-password-otp", resetPasswordWithOTP);
router.get("/me", protect, async (req, res) => {
    const user = await User.findById(req.user._id)
        .select("-password")
        .populate("college", "name")
        .populate("department", "name")
        .populate("degree", "name")
        .populate("course", "name")
        .populate("semester", "name");

    res.json(user);
});


module.exports = router;