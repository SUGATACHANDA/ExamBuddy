// backend/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        collegeId: { type: String, required: true, unique: true }, // Can be an Employee ID or Student Roll No.
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true, select: false },
        // --- UPDATED ROLES ---
        role: {
            type: String,
            enum: ["student", "teacher", "HOD", "university_affairs", "admin"],
            required: true,
        },

        // --- HIERARCHY FIELDS ---
        // Every user belongs to a college.
        college: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "College",
            required: true,
        },

        // Only Teachers and HODs are tied directly to a department.
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: function () {
                return ["teacher", "HOD"].includes(this.role);
            },
        },

        degree: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Degree",
            required: function () {
                return this.role === "student";
            },
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: function () {
                return this.role === "student";
            },
        },
        semester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Semester",
            required: function () {
                return this.role === "student";
            },
        },
        resetOTP: { type: String },

        resetOTPExpiry: { type: Date },

        resetOTPResendAfter: { type: Date },

        photoUrl: { type: String },

        photoPublicId: { type: String },

        photoVerified: { type: Boolean, default: false },

        faceDescriptor: { type: [Number] },
    },
    { timestamps: true }
);

// (Your bcrypt pre-save hook and matchPassword method are correct and do not need to change)
userSchema.pre("save", async function (next) {
    // We only want to re-hash the password if it's being modified
    // (or if it's a new user). This prevents re-hashing on an unrelated update (e.g., changing name).
    if (!this.isModified("password")) {
        return next();
    }

    // Generate a salt and then hash the password
    console.log("Hashing password for user:", this.email); // Add a log for confirmation
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// 3. --- ATTACH THE INSTANCE METHOD TO THE SCHEMA ---
// This method will be available on every user document retrieved from the DB.
userSchema.methods.matchPassword = async function (enteredPassword) {
    // `bcrypt.compare` will safely compare the plaintext password from the user
    // with the hashed password stored in this document (`this.password`).
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
