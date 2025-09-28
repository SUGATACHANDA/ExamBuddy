// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authUser, changePassword, resetPassword, forgotPassword, requestPasswordResetOTP, verifyPasswordResetOTP, resetPasswordWithOTP } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/login', authUser);
router.put('/change-password', protect, changePassword); // Logged-in users only
router.post('/forgot-password', forgotPassword); // Public
router.put('/reset-password/:token', resetPassword);
router.post("/request-otp", requestPasswordResetOTP);
router.post("/verify-otp", verifyPasswordResetOTP);
router.post("/reset-password-otp", resetPasswordWithOTP);


module.exports = router;