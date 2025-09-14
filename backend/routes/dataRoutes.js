// backend/routes/dataRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose'); // Import mongoose to use ObjectId
const { protect } = require('../middlewares/authMiddleware');

const Semester = require('../models/Semester');

router.get('/semesters', protect, asyncHandler(async (req, res) => {

    const departmentId = req.query.department;
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
        // Return a 400 Bad Request if the ID is missing or invalid.
        return res.status(400).json({ message: 'A valid department ID is required.' });
    }

    // The database query is correct.
    const semesters = await Semester.find({
        department: new mongoose.Types.ObjectId(departmentId)
    }).sort({ number: 1 }).lean();

    // --- THIS IS THE DEFINITIVE, FINAL FIX for the backend response ---
    // We will use the standard Express/Vercel `status().json()` method.
    // The previous manual stringification is no longer needed and was causing issues.
    // This tells Vercel to handle the JSON response correctly.
    res.status(200).json(semesters);
    // ----------------------------------------------------------------

}));

module.exports = router;