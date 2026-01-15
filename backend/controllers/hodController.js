const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Degree = require('../models/Degree'); // For populating ancestry if needed
const Semester = require('../models/Semester')
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const UserRegistrationEmail = require('../emails/UserRegistrationEmail');
const sendEmail = require('../utils/mailer');
// const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const fs = require('fs')
const { v2: cloudinary } = require('cloudinary');
const csvParser = require("csv-parser");
const { Readable } = require("stream");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFromBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: "students/face" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

function removeBOM(str) {
    if (typeof str === "string") {
        return str.replace(/^\uFEFF/, "");
    }
    return str;
}

function cleanObjectId(value) {
    if (!value) return value;

    // Matches: ObjectId('xxxxxxx')
    const match = value.match(/ObjectId\('(.+)'\)/);

    return match ? match[1] : value; // return only the hex value
}

// =========================================================================
// == USER REGISTRATION (BY HOD)
// =========================================================================

/** @desc    Register a new Teacher in the HOD's own department */
/** @route   POST /api/hod/users/register-teacher */
exports.registerTeacher = asyncHandler(async (req, res) => {
    const { collegeId, name, email, password, role } = req.body;

    // The HOD's own college and department are the single source of truth.
    const { college, department } = req.user;

    const userExists = await User.findOne({ $or: [{ email }, { collegeId }] });
    if (userExists) {
        res.status(400);
        throw new Error('User with this email or Employee ID already exists.');
    }

    // Create the user, automatically scoping them to the HOD's context.
    const user = await User.create({ collegeId, name, email, password, role: 'teacher', college, department });
    const html = UserRegistrationEmail({
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        password: password, // temporary password
    });
    await sendEmail(user.email, "Welcome to ExamBuddy – Your Account Details", html);
    res.status(201).json({ _id: user._id, name: user.name });
});


/** @desc    Register a new Student for a course within the HOD's department */
/** @route   POST /api/hod/users/register-student */
exports.registerStudent = asyncHandler(async (req, res) => {
    const { collegeId, name, email, password, course, semester, photoBase64, descriptor } = req.body;
    const { college: hodCollege, department: hodDepartmentId } = req.user;

    const userExists = await User.findOne({ $or: [{ email }, { collegeId }] });

    if (userExists) {
        res.status(400);
        throw new Error('User with this email or Roll No. already exists.');
    }

    let photoUrl = null;
    if (req.file && req.file.buffer) {
        const uploadRes = await uploadFromBuffer(req.file.buffer);
        photoUrl = uploadRes.secure_url;
    } else if (req.body.photoBase64) {
        const uploadRes = await cloudinary.uploader.upload(req.body.photoBase64, {
            folder: "students/face"
        });
        photoUrl = uploadRes.secure_url;
    }
    let descriptorArray = [];
    if (req.body.descriptor) {
        try {
            descriptorArray = JSON.parse(req.body.descriptor); // array of numbers
        } catch (e) {
            // ignore parse error
        }
    }


    // --- Definitive Security Check ---
    // 1. Find the department that is the parent of the selected course.
    const parentDeptOfCourse = await Department.findOne({ course: course });

    // 2. Validate: Does that department exist, and is it the same as the HOD's department?
    if (!parentDeptOfCourse || parentDeptOfCourse._id.toString() !== hodDepartmentId.toString()) {
        res.status(403); // Forbidden
        throw new Error("Authorization Error: You can only register students for courses managed by your department.");
    }
    // ------------------------------------

    // 3. Get the Degree from the course to construct the full student record.
    const courseDoc = await Course.findById(course);

    const payload = {
        collegeId, name, email, password,
        role: 'student',
        college: hodCollege,           // From HOD's profile
        department: hodDepartmentId,   // From HOD's profile
        degree: courseDoc.degree,    // Looked up from the validated Course
        course: course,              // From the form
        semester: semester,          // From the form
        photoUrl: photoUrl || null,
        faceDescriptor: descriptorArray.length ? descriptorArray : undefined,
    };

    // if (descriptor) {
    //     try {
    //         const descArray = JSON.parse(descriptor);
    //         if (Array.isArray(descArray) && descArray.length === 128) {
    //             payload.faceDescriptor = descArray;
    //         } else {
    //             console.warn("[registerStudent] Invalid descriptor array size");
    //         }
    //     } catch (err) {
    //         console.error("Error parsing descriptor JSON:", err);
    //     }
    // }

    const user = await User.create(payload);
    const html = UserRegistrationEmail({
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        password: password, // temporary password
    });
    await sendEmail(user.email, "Welcome to ExamBuddy – Your Account Details", html);
    res.status(201).json({ _id: user._id, name: user.name });
});

exports.bulkCSVUpload = asyncHandler(async (req, res) => {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("req.file:", req.file);
    console.log("req.body keys:", Object.keys(req.body || {}));
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({
            message: "CSV file not present",
            headers: req.headers["content-type"],
            bodyKeys: Object.keys(req.body || {})
        });
    }

    const role = req.body.role;
    if (!["student", "teacher"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const results = [];
    const failed = [];



    /**
     * ✅ CORRECT: buffer → stream (NO toString)
     */
    const stream = Readable.from(req.file.buffer);

    stream
        .pipe(csvParser({ skipLines: 0 }))
        .on("data", (row) => {
            const cleanRow = {};

            for (const key in row) {
                const cleanKey = key.replace(/^\uFEFF/, "").trim();
                let value = row[key];

                if (typeof value === "string") {
                    value = value.trim();
                    value = cleanObjectId(value);
                }

                cleanRow[cleanKey] = value;
            }

            results.push(cleanRow);
        })
        .on("end", async () => {
            try {
                for (const row of results) {
                    try {
                        if (role === "teacher") {
                            await createTeacherFromCSV(row, req.user);
                        } else {
                            await createStudentFromCSV(row, req.user);
                        }
                    } catch (err) {
                        failed.push({ row, error: err.message });
                    }
                }

                return res.json({
                    total: results.length,
                    success: results.length - failed.length,
                    failed,
                });
            } catch (err) {
                console.error("CSV processing failed:", err);
                return res.status(500).json({
                    message: "CSV processing failed",
                    error: err.message,
                });
            }
        })
        .on("error", (err) => {
            console.error("CSV parse error:", err);
            return res.status(500).json({
                message: "Failed to parse CSV",
                error: err.message,
            });
        });
});


// --------------------------------------
// HELPERS
// --------------------------------------
async function createTeacherFromCSV(row, hodUser) {
    const { name, collegeId, email, password } = row;

    if (!name || !collegeId || !email || !password) {
        throw new Error("Missing required teacher fields");
    }

    const exists = await User.findOne({
        $or: [{ email }, { collegeId }]
    });
    if (exists) throw new Error("User already exists");

    await User.create({
        name,
        collegeId,
        email,
        password,
        role: "teacher",
        college: hodUser.college,
        department: hodUser.department,
    });
}


// Create student from CSV row
async function createStudentFromCSV(row, hodUser) {
    const { name, collegeId, email, password } = row;

    const degree = cleanObjectId(row.degree);
    const course = cleanObjectId(row.course);
    const semester = cleanObjectId(row.semester);

    if (!name || !collegeId || !email || !password || !course || !semester) {
        throw new Error("Missing required student fields");
    }

    /**
     * ✅ ADD DUPLICATE CHECK (YOU WERE MISSING THIS)
     */
    const exists = await User.findOne({
        $or: [{ email }, { collegeId }]
    });
    if (exists) throw new Error("User already exists");

    const createdUser = await User.create({
        name,
        collegeId,
        email,
        password,
        role: "student",
        college: hodUser.college,
        department: hodUser.department,
        degree,
        course,
        semester,
    });

    const html = UserRegistrationEmail({
        name: createdUser.name,
        role: createdUser.role,
        collegeId: createdUser.collegeId,
        password,
    });

    await sendEmail(
        createdUser.email,
        `Welcome ${createdUser.name} – Your ExamBuddy Login Details`,
        html
    );
}


// =========================================================================
// == GET USER LISTS (Scoped to HOD's Department)
// =========================================================================

/** @desc    Get all students in the HOD's department */
/** @route   GET /api/hod/students */
/** @desc    Get all students in the HOD's department */
/** @route   GET /api/hod/students */
exports.getStudentsInDepartment = asyncHandler(async (req, res) => {
    const { semester } = req.query;
    const query = { role: 'student', department: req.user.department };

    if (semester && semester !== 'all') {
        query.semester = semester;
    }

    const students = await User.find(query)
        .populate('semester', 'number')
        .populate('course', 'name')
        .select('-password');

    // Optional: sort by semester number ascending
    students.sort((a, b) => {
        if (!a.semester || !b.semester) return 0;
        return a.semester.number - b.semester.number;
    });

    res.json(students);
});

/** @desc    Get all teachers in the HOD's department */
/** @route   GET /api/hod/teachers */
exports.getTeachersInDepartment = asyncHandler(async (req, res) => {
    const teachers = await User.find({
        role: 'teacher',
        department: req.user.department
    })
        .select('-password')
        .lean();

    res.json({
        success: true,
        data: teachers
    });
});


// =========================================================================
// == USER CRUD by HOD (Update & Delete)
// =========================================================================

/** @desc    Update a user within the HOD's department */
/** @route   PUT /api/hod/users/:id */
exports.updateUserByHOD = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user || user.department?.toString() !== req.user.department.toString()) {
        res.status(403);
        throw new Error("User not found or is not in your department.");
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.collegeId = req.body.collegeId || user.collegeId;

    // ✅ allow semester updates for students
    if (user.role === 'student' && req.body.semester) {
        user.semester = req.body.semester;
    }

    const updatedUser = await user.save();
    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        collegeId: updatedUser.collegeId,
        semester: updatedUser.semester
    });
});

/** @desc    Delete a user within the HOD's department */
/** @route   DELETE /api/hod/users/:id */
exports.deleteUserByHOD = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user || user.department?.toString() !== req.user.department.toString()) {
        res.status(403);
        throw new Error("User not found or is not in your department.");
    }

    await user.deleteOne();
    res.json({ message: 'User removed successfully.' });
});


// =========================================================================
// == DATA FOR FORMS
// =========================================================================

/**
 * @desc    Get a list of courses that are ONLY within the HOD's own department.
 * @route   GET /api/hod/my-courses
 * @access  Private/HOD
 */
exports.getCoursesForHOD = asyncHandler(async (req, res) => {
    const hodDepartmentId = req.user.department;
    if (!hodDepartmentId) {
        return res.json([]); // Return empty if HOD somehow has no department
    }

    // Find all courses that have the HOD's department assigned to them.
    const departmentsWithCourses = await Department.find({ _id: hodDepartmentId })
        .populate('course') // Populate the referenced Course documents
        .lean(); // Use lean for performance

    if (!departmentsWithCourses || departmentsWithCourses.length === 0) {
        return res.json([]);
    }

    // The result is an array of Department objects, each with a 'course' property.
    // We need to extract just the course objects.
    const courses = departmentsWithCourses.map(dept => dept.course).filter(Boolean); // filter(Boolean) removes any nulls if a course was deleted but ref remains

    // Attach the department ID to each course so the frontend can use it for cascading lookups.
    const coursesWithDept = courses.map(course => ({
        ...course,
        department: hodDepartmentId
    }));

    res.json(coursesWithDept);
});

exports.getAllDepartmentExams = asyncHandler(async (req, res) => {
    const hodDepartmentId = req.user.department;
    if (!hodDepartmentId) {
        return res.json([]); // HOD not assigned to a dept
    }

    // 1. Find all semesters that belong to the HOD's department.
    const semestersInDept = await Semester.find({ department: hodDepartmentId }).select('_id');
    const semesterIds = semestersInDept.map(s => s._id);

    // 2. Find all exams scheduled for any of those semesters.
    const exams = await Exam.find({ semester: { $in: semesterIds } })
        .sort({ scheduledAt: -1 })
        .lean(); // Use lean for performance

    const examsWithCount = exams.map(exam => ({
        ...exam,
        questionCount: exam.questions ? exam.questions.length : 0
    }));

    res.json(examsWithCount);
});

/**
 * @desc    Get all exams for the HOD's department WITH summary results
 * @route   GET /api/hod/exams-with-results
 * @access  Private/HOD
 */
exports.getExamsWithResults = asyncHandler(async (req, res) => {
    const hodDepartmentId = req.user.department;
    if (!hodDepartmentId) return res.json([]);

    // 1. Find all semesters belonging to the HOD's department
    const semestersInDept = await Semester.find({ department: hodDepartmentId }).select('_id');
    const semesterIds = semestersInDept.map(s => s._id);

    // 2. Find all exams scheduled for any of those semesters
    const exams = await Exam.find({ semester: { $in: semesterIds } })
        .populate('semester', 'number') // Populate semester number for display
        .populate('subject', 'name') // Populate semester number for display
        .sort({ scheduledAt: -1 })
        .lean(); // Use .lean() for performance

    // 3. For each exam, fetch its results and calculate summary stats
    const examsWithStats = await Promise.all(exams.map(async (exam) => {
        const results = await Result.find({ exam: exam._id }).lean();
        const submissionCount = results.length;

        let averageScore = 0;
        if (submissionCount > 0) {
            const totalScore = results.reduce((acc, r) => acc + r.score, 0);
            averageScore = (totalScore / submissionCount).toFixed(2);
        }

        return {
            ...exam,
            submissionCount,
            averageScore,
        };
    }));

    res.json(examsWithStats);
});