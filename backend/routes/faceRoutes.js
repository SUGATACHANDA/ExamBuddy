const express = require("express");
const router = express.Router();
const faceController = require("../controllers/faceController");

router.post("/verify-descriptor", faceController.verifyDescriptor);

module.exports = router;
