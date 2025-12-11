const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { updateStudentBiometric, getStudentProfile } = require("../controllers/studentController");

// ----------------------------------
// Student biometric registration
// ----------------------------------
router.put("/biometric", protect, updateStudentBiometric);
router.get("/profile/:id", protect, getStudentProfile);

module.exports = router;
