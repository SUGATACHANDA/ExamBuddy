const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// --------------------------------------------------------
// UPDATE BIOMETRIC (Face Descriptor + optional photo)
// --------------------------------------------------------
exports.getStudentProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id)
        .populate("college")
        .populate("department")
        .populate("degree")
        .populate("course")
        .populate("semester");

    if (!user) {
        return res.status(404).json({ message: "Student not found" });
    }

    // Return complete user profile
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        collegeId: user.collegeId,
        role: user.role,
        photoUrl: user.photoUrl || null,

        // Populated objects
        college: user.college || null,
        department: user.department || null,
        degree: user.degree || null,
        course: user.course || null,
        semester: user.semester || null,

        faceDescriptor: user.faceDescriptor || null,
        createdAt: user.createdAt,
    });
});

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

    const updatedUser = await User.findById(req.user._id).select("-password");

    res.json({
        message: "Biometric registered successfully",
        user: updatedUser,
    });
});
