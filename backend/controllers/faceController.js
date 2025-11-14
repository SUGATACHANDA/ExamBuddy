// controllers/faceController.js
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

function euclideanDistance(arr1, arr2) {
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        const d = arr1[i] - arr2[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}

exports.verifyDescriptor = asyncHandler(async (req, res) => {
    try {
        const { collegeId, descriptor } = req.body;
        if (!collegeId || !descriptor) return res.status(400).json({ message: "Missing collegeId or descriptor" });

        const student = await User.findOne({ collegeId });
        if (!student || !student.faceDescriptor || student.faceDescriptor.length === 0) {
            return res.status(404).json({ message: "Stored face descriptor not found" });
        }

        const stored = student.faceDescriptor; // array of numbers
        const incoming = Array.isArray(descriptor) ? descriptor : JSON.parse(descriptor);

        if (stored.length !== incoming.length) {
            return res.status(400).json({ message: "Descriptor length mismatch" });
        }

        const distance = euclideanDistance(stored, incoming);
        // typical threshold for face-api descriptors: 0.6 (tune)
        const threshold = 0.6;
        const match = distance < threshold;

        return res.status(match ? 200 : 401).json({
            match,
            distance,
            message: match ? "Face verified" : "Face verification failed",
        });
    } catch (err) {
        console.error("verifyDescriptor error:", err);
        res.status(500).json({ message: "Error verifying face", error: err.message });
    }
});
