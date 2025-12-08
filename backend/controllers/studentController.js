const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// --------------------------------------------------------
// UPDATE BIOMETRIC (Face Descriptor + optional photo)
// --------------------------------------------------------
exports.updateStudentBiometric = asyncHandler(async (req, res) => {
    const { descriptor, photoBase64 } = req.body;

    if (!descriptor) {
        return res.status(400).json({ message: "Descriptor missing" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "student") {
        return res.status(403).json({ message: "Only students can update biometrics" });
    }

    user.faceDescriptor = descriptor;
    if (photoBase64) {
        user.photoUrl = photoBase64;
        user.photoVerified = true;
    }

    await user.save();

    res.json({ message: "Biometric registered successfully" });
});
