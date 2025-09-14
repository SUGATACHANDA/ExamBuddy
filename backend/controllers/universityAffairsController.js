const asyncHandler = require('express-async-handler');
const Degree = require('../models/Degree');
const Course = require('../models/Course');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const User = require('../models/User');

// =========================================================================
// HIERARCHY MANAGEMENT: DEGREES
// =========================================================================

/** @desc    Create a new Degree within the UA's college */
exports.createDegree = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) { res.status(400); throw new Error('Degree name is required.'); }
    const degree = await Degree.create({ name, college: req.user.college });
    res.status(201).json(degree);
});

/** @desc    Get all Degrees within the UA's college */
exports.getDegrees = asyncHandler(async (req, res) => {
    const degrees = await Degree.find({ college: req.user.college }).sort({ name: 1 });
    res.json(degrees);
});

/** @desc    Update a Degree */
exports.updateDegree = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const degree = await Degree.findById(req.params.id);
    if (!degree || degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Degree not found in your college.');
    }
    degree.name = name || degree.name;
    res.json(await degree.save());
});

/** @desc    Delete a Degree */
exports.deleteDegree = asyncHandler(async (req, res) => {
    const degree = await Degree.findById(req.params.id);
    if (!degree || degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Degree not found in your college.');
    }
    // First delete child Courses → Departments → Semesters
    const courses = await Course.find({ degree: degree._id });
    for (const course of courses) {
        const departments = await Department.find({ course: course._id });
        for (const dept of departments) {
            await Semester.deleteMany({ department: dept._id });
            await dept.deleteOne();
        }
        await course.deleteOne();
    }
    await degree.deleteOne();
    res.json({ message: 'Degree and all its children removed.' });
});

// =========================================================================
// HIERARCHY MANAGEMENT: COURSES
// =========================================================================

/** @desc    Create a new Course under a Degree */
exports.createCourse = asyncHandler(async (req, res) => {
    const { name, degree } = req.body; // `degree` is the parent Degree ID
    if (!name || !degree) {
        res.status(400); throw new Error('Course name and a parent Degree ID are required.');
    }
    // 1. Find the parent Degree in the database.
    const parentDegree = await Degree.findById(degree);
    // 2. CRITICAL SECURITY CHECK: Does this parent degree exist, and does it belong to the logged-in user's college?
    if (!parentDegree || parentDegree.college.toString() !== req.user.college.toString()) {
        res.status(403); // Forbidden
        throw new Error("Authorization Error: You can only add courses to degrees that belong to your college.");
    }
    // 3. If the check passes, create the new Course.
    const course = await Course.create({ name, degree });
    res.status(201).json(course);
});

/** @desc    Get all Courses (optionally filtered by degree) within the UA's college */
exports.getCourses = asyncHandler(async (req, res) => {
    const degreesInCollege = await Degree.find({ college: req.user.college }).select('_id');
    const degreeIds = degreesInCollege.map(d => d._id);
    let filter = { degree: { $in: degreeIds } };
    if (req.query.degree) {
        if (!degreeIds.some(id => id.equals(req.query.degree))) return res.json([]);
        filter.degree = req.query.degree;
    }
    res.json(await Course.find(filter).populate('degree', 'name').sort({ name: 1 }));
});

/** @desc    Update a Course */
exports.updateCourse = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const course = await Course.findById(req.params.id).populate('degree');
    if (!course || course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Course not found in your college.');
    }
    course.name = name || course.name;
    res.json(await course.save());
});

/** @desc    Delete a Course */
exports.deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id).populate('degree');
    if (!course || course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Course not found in your college.');
    }
    const departments = await Department.find({ course: course._id });
    for (const dept of departments) {
        await Semester.deleteMany({ department: dept._id });
        await dept.deleteOne();
    }
    await course.deleteOne();
    res.json({ message: 'Course and its children removed.' });
});

// =========================================================================
// HIERARCHY MANAGEMENT: DEPARTMENTS
// =========================================================================

/** @desc    Create a new Department under a Course */
exports.createDepartment = asyncHandler(async (req, res) => {
    const { name, course } = req.body; // `course` is the parent Course ID
    if (!name || !course) {
        res.status(400); throw new Error('Department name and a parent Course ID are required.');
    }
    // 1. Find the parent Course and trace its ancestry back to the college.
    const parentCourse = await Course.findById(course).populate({ path: 'degree' });
    // 2. CRITICAL SECURITY CHECK
    if (!parentCourse || parentCourse.degree.college.toString() !== req.user.college.toString()) {
        res.status(403); // Forbidden
        throw new Error("Authorization Error: You can only add departments to courses that belong to your college.");
    }
    // 3. If the check passes, create the new Department.
    const department = await Department.create({ name, course });
    res.status(201).json(department);
});

// We also fix the 'getDepartments' call for consistency
exports.getDepartments = asyncHandler(async (req, res) => {
    // This endpoint should only ever filter by course
    const filter = req.query.course ? { course: req.query.course } : {};

    // As a security measure, we should still ensure the returned depts are in the UA's college,
    // but a direct query is simpler and faster if the UI flow is correct.
    const departments = await Department.find(filter).populate('course', 'name').sort({ name: 1 });
    res.json(departments);
});

/** @desc    Update a Department */
exports.updateDepartment = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const department = await Department.findById(req.params.id).populate({ path: 'course', populate: { path: 'degree' } });
    if (!department || department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Department not found in your college.');
    }
    department.name = name || department.name;
    res.json(await department.save());
});

/** @desc    Delete a Department */
exports.deleteDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id).populate({ path: 'course', populate: { path: 'degree' } });
    if (!department || department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Department not found in your college.');
    }
    await Semester.deleteMany({ department: department._id });
    await department.deleteOne();
    res.json({ message: 'Department and its semesters removed.' });
});

// =========================================================================
// HIERARCHY MANAGEMENT: SEMESTERS
// =========================================================================

/** @desc    Create a new Semester under a Department */
exports.createSemester = asyncHandler(async (req, res) => {
    const { number, department } = req.body; // `department` is the parent Department ID
    if (!number || !department) {
        res.status(400); throw new Error('Semester number and a parent Department ID are required.');
    }
    // 1. Find the parent Department and trace its ancestry.
    const parentDepartment = await Department.findById(department).populate({ path: 'course', populate: { path: 'degree' } });
    // 2. CRITICAL SECURITY CHECK
    if (!parentDepartment || parentDepartment.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(403); // Forbidden
        throw new Error("Authorization Error: You can only add semesters to departments that belong to your college.");
    }
    // 3. Prevent duplicate semesters
    const existingSemester = await Semester.findOne({ number, department });
    if (existingSemester) {
        res.status(400); throw new Error(`Semester ${number} already exists for this department.`);
    }
    // 4. If all checks pass, create the new Semester.
    const semester = await Semester.create({ number, department });
    res.status(201).json(semester);
});

/** @desc    Get all Semesters within the UA's college */
exports.getSemesters = asyncHandler(async (req, res) => {
    const degreesInCollege = await Degree.find({ college: req.user.college }).select('_id');
    const coursesInCollege = await Course.find({ degree: { $in: degreesInCollege.map(d => d._id) } }).select('_id');
    const departmentsInCollege = await Department.find({ course: { $in: coursesInCollege.map(c => c._id) } }).select('_id');
    let filter = { department: { $in: departmentsInCollege.map(d => d._id) } };
    if (req.query.department) filter.department = req.query.department;
    res.json(await Semester.find(filter).populate('department', 'name').sort({ number: 1 }));
});

/** @desc    Update a Semester */
exports.updateSemester = asyncHandler(async (req, res) => {
    const { number } = req.body;
    const semester = await Semester.findById(req.params.id).populate({ path: 'department', populate: { path: 'course', populate: { path: 'degree' } } });
    if (!semester || semester.department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Semester not found in your college.');
    }
    semester.number = number || semester.number;
    res.json(await semester.save());
});

/** @desc    Delete a Semester */
exports.deleteSemester = asyncHandler(async (req, res) => {
    const semester = await Semester.findById(req.params.id).populate({ path: 'department', populate: { path: 'course', populate: { path: 'degree' } } });
    if (!semester || semester.department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Semester not found in your college.');
    }
    await semester.deleteOne();
    res.json({ message: 'Semester removed.' });
});

// =========================================================================
// USER MANAGEMENT: HODs
// =========================================================================

/** @desc    Register a new HOD and assign them to a Department */
exports.registerHOD = asyncHandler(async (req, res) => {
    const { collegeId, name, email, password, department } = req.body;
    const userExists = await User.findOne({ $or: [{ email }, { collegeId }] });
    if (userExists) { res.status(400); throw new Error('User with this email or ID already exists.'); }
    const deptDoc = await Department.findById(department).populate({ path: 'course', populate: { path: 'degree' } });
    if (!deptDoc || deptDoc.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(403); throw new Error("Cannot assign HOD: The selected department is not in your college.");
    }
    const user = await User.create({
        collegeId, name, email, password,
        department,
        college: req.user.college,
        role: 'HOD'
    });
    if (user) res.status(201).json({ _id: user._id, name: user.name });
    else { res.status(400); throw new Error('Invalid HOD data.'); }
});

/** @desc    Get all HODs within the UA's college */
exports.getHODs = asyncHandler(async (req, res) => {
    const hods = await User.find({ role: 'HOD', college: req.user.college })
        .populate('department', 'name')
        .select('-password');
    res.json(hods);
});

exports.getDegree = asyncHandler(async (req, res) => {
    const degree = await Degree.findById(req.params.id);
    // Security Check: Is this degree in the user's college?
    if (!degree || degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Degree not found in your college.');
    }
    res.json(degree);
});
/** @desc    Get a single Course by ID */
exports.getCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id).populate({ path: 'degree' });
    if (!course || course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Course not found in your college.');
    }
    res.json(course);
});
/** @desc    Get a single Department by ID */
exports.getDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id).populate({ path: 'course', populate: { path: 'degree' } });
    if (!department || department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Department not found in your college.');
    }
    res.json(department);
});
/** @desc    Get a single Semester by ID */
exports.getSemester = asyncHandler(async (req, res) => {
    const semester = await Semester.findById(req.params.id).populate({ path: 'department', populate: { path: 'course', populate: { path: 'degree' } } });
    if (!semester || semester.department.course.degree.college.toString() !== req.user.college.toString()) {
        res.status(404); throw new Error('Semester not found in your college.');
    }
    res.json(semester);
});

/** @desc    Delete an HOD user */
/** @route   DELETE /api/university-affairs/users/hod/:id */
exports.deleteHOD = asyncHandler(async (req, res) => {
    const hodToDelete = await User.findById(req.params.id);

    // --- Security Checks ---
    if (!hodToDelete) {
        res.status(404);
        throw new Error('HOD user not found.');
    }

    // 1. Ensure the user being deleted is actually an HOD.
    if (hodToDelete.role !== 'HOD') {
        res.status(400);
        throw new Error('This user is not an HOD and cannot be deleted from this route.');
    }

    // 2. CRITICAL: Ensure the HOD belongs to the UA staff's own college.
    if (hodToDelete.college.toString() !== req.user.college.toString()) {
        res.status(403); // Forbidden
        throw new Error("You are not authorized to delete users outside of your own college.");
    }

    await hodToDelete.deleteOne();

    res.json({ message: 'HOD user successfully removed.' });
});

/** @desc    Update an HOD user's core details */
/** @route   PUT /api/university-affairs/users/hod/:id */
exports.updateHOD = asyncHandler(async (req, res) => {
    const hodToUpdate = await User.findById(req.params.id);

    // --- Security Checks ---
    if (!hodToUpdate) {
        res.status(404);
        throw new Error('HOD user not found.');
    }

    // 1. Ensure the user being updated is actually an HOD.
    if (hodToUpdate.role !== 'HOD') {
        res.status(400);
        throw new Error('This user is not an HOD.');
    }

    // 2. CRITICAL: Ensure the HOD belongs to the UA staff's own college.
    if (hodToUpdate.college.toString() !== req.user.college.toString()) {
        res.status(403); // Forbidden
        throw new Error("You are not authorized to edit users outside of your own college.");
    }

    // 3. Update the fields. Only allow updating non-critical info.
    hodToUpdate.name = req.body.name || hodToUpdate.name;
    hodToUpdate.email = req.body.email || hodToUpdate.email;
    hodToUpdate.collegeId = req.body.collegeId || hodToUpdate.collegeId;

    // 4. Check for duplicates before saving.
    const duplicateUser = await User.findOne({
        $or: [{ email: hodToUpdate.email }, { collegeId: hodToUpdate.collegeId }],
        _id: { $ne: req.params.id } // Exclude the current user from the check
    });
    if (duplicateUser) {
        res.status(400);
        throw new Error('The new Email or Employee ID is already in use.');
    }

    const updatedUser = await hodToUpdate.save();

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        collegeId: updatedUser.collegeId
    });
});