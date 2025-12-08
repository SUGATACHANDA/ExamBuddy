const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { updateStudentBiometric } = require("../controllers/studentController");

// ----------------------------------
// Student biometric registration
// ----------------------------------
router.put("/biometric", protect, updateStudentBiometric);

module.exports = router;
