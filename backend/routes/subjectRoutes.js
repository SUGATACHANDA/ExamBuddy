const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const { createSubject, getSubjects, deleteSubject } = require("../controllers/subjectController");

router.post("/", protect, createSubject);
router.get("/", protect, getSubjects);
router.delete("/:id", protect, deleteSubject);

module.exports = router;
