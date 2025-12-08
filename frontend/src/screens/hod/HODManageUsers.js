/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import { useAuth } from "../../context/AuthContext";
import EditUserModal from "../admin/EditUserModal";
import UserCard from "../../components/ui/UserCard";
import Pagination from "../../components/teacher/Pagination";
import LoadingScreen from "components/LoadingScreen";
import { getDescriptorFromFile } from '../../utils/faceUtils';

const HODManageUsers = () => {
    const { userInfo } = useAuth();
    const [activeTab, setActiveTab] = useState("viewStudents");
    const [formRole, setFormRole] = useState("student");
    const [formState, setFormState] = useState({});
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [semestersInDept, setSemestersInDept] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [editingUser, setEditingUser] = useState(null);

    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("all");
    const [photoFile, setPhotoFile] = useState(null);


    // separate search states
    const [studentSearchQuery, setStudentSearchQuery] = useState("");
    const [teacherSearchQuery, setTeacherSearchQuery] = useState("");

    const [csvFile, setCsvFile] = useState(null);
    const [csvRole, setCsvRole] = useState("student");
    const [csvUploadResult, setCsvUploadResult] = useState(null);

    const usersPerPage = 6;

    const resetForm = useCallback((role) => {
        setFormState({
            name: "",
            collegeId: "",
            email: "",
            password: "",
            role,
            course: "",
            semester: "",
        });
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsRes, teachersRes, coursesRes, semestersRes] = await Promise.all([
                api.get("/hod/students"),
                api.get("/hod/teachers"),
                api.get("/hod/my-courses"),
                api.get(`/data/semesters?department=${userInfo.department?._id}`),
            ]);
            setStudents(studentsRes.data || []);
            setTeachers(teachersRes.data || []);
            setCourses(coursesRes.data || []);
            setSemestersInDept(semestersRes.data || []);
        } catch (e) {
            setError("Failed to load required data.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [userInfo?.department?._id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtered students
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSemester =
                selectedSemesterFilter === "all" ||
                student.semester?._id === selectedSemesterFilter;

            const matchesSearch =
                studentSearchQuery.trim() === "" ||
                student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                student.collegeId?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase());

            return matchesSemester && matchesSearch;
        });
    }, [students, selectedSemesterFilter, studentSearchQuery]);

    // Filtered teachers
    const filteredTeachers = useMemo(() => {
        return teachers.filter((teacher) => {
            return (
                teacherSearchQuery.trim() === "" ||
                teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                teacher.collegeId?.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                teacher.email?.toLowerCase().includes(teacherSearchQuery.toLowerCase())
            );
        });
    }, [teachers, teacherSearchQuery]);

    // Pagination
    const paginatedStudents = useMemo(() => {
        return filteredStudents.slice(
            (studentPage - 1) * usersPerPage,
            studentPage * usersPerPage
        );
    }, [filteredStudents, studentPage]);

    const paginatedTeachers = useMemo(() => {
        return filteredTeachers.slice(
            (teacherPage - 1) * usersPerPage,
            teacherPage * usersPerPage
        );
    }, [filteredTeachers, teacherPage]);

    const totalStudentPages = Math.ceil(filteredStudents.length / usersPerPage);
    const totalTeacherPages = Math.ceil(filteredTeachers.length / usersPerPage);

    const handleSemesterFilterChange = (e) => {
        setSelectedSemesterFilter(e.target.value);
        setStudentPage(1);
    };

    const handleStudentSearchChange = (e) => {
        setStudentSearchQuery(e.target.value);
        setStudentPage(1);
    };

    const handleTeacherSearchChange = (e) => {
        setTeacherSearchQuery(e.target.value);
        setTeacherPage(1);
    };

    const handleResetStudentFilters = () => {
        setSelectedSemesterFilter("all");
        setStudentSearchQuery("");
        setStudentPage(1);
    };

    const handleResetTeacherFilters = () => {
        setTeacherSearchQuery("");
        setTeacherPage(1);
    };

    useEffect(() => {
        setSemesters([]);
        const newFormState = { ...formState, semester: "" };
        if (newFormState.course) {
            const courseData = courses.find((c) => c._id === newFormState.course);
            if (courseData && courseData.department) {
                api.get(`/data/semesters?department=${courseData.department}`)
                    .then((res) => setSemesters(res.data))
                    .catch((err) => console.error("Could not fetch semesters: ", err));
            }
        }
        setFormState(newFormState);
    }, [formState.course, courses]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            // determine endpoint based on role
            const endpoint =
                formRole === "student"
                    ? "/hod/users/register-student"
                    : "/hod/users/register-teacher";

            // ✅ Prepare FormData (to send both photo + optional face descriptor)
            const formData = new FormData();

            // Append all regular form fields
            Object.keys(formState).forEach((key) => {
                if (formState[key] !== undefined && formState[key] !== null) {
                    formData.append(key, formState[key]);
                }
            });

            // Append role (always required)
            formData.append("role", formRole);

            // Append photo if available
            if (formRole === "student" && photoFile) {
                formData.append("photo", photoFile);
            }

            // ✅ Capture and append face descriptor + cropped face if student registration
            if (formRole === "student" && photoFile) {
                try {
                    const descriptor = await getDescriptorFromFile(photoFile);
                    // descriptor is Float32Array(128) — stringify to array of numbers
                    formData.append("descriptor", JSON.stringify(Array.from(descriptor)));
                    // Optionally append the cropped face base64 as well if you want to store photo
                    // You can crop client-side if desired (not mandatory)
                    console.log("[Registration] descriptor appended");
                } catch (err) {
                    console.warn("[Registration] Could not get face descriptor:", err);
                    // proceed without descriptor (or warn user)
                }
            }

            // ✅ Post to backend
            await api.post(endpoint, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setSuccess(`Successfully registered ${formRole}: ${formState.name}!`);
            await fetchData();
            resetForm(formRole);
            setPhotoFile(null);
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user? This is permanent.")) {
            setLoading(true);
            try {
                await api.delete(`/hod/users/${id}`);
                await fetchData();
            } catch {
                setError("Failed to delete user.");
            } finally {
                setLoading(false);
            }
        }
    };

    const openEditModal = (user) => setEditingUser(user);
    const handleFormRoleChange = (role) => {
        setFormRole(role);
        resetForm(role);
    };
    const handleChange = (e) =>
        setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setStudentPage(1);
        setTeacherPage(1);
        setError("");
        setSuccess("");
    };

    return (
        <>
            {loading && <LoadingScreen />}
            <div className="container">
                <Link to="/hod/dashboard" className="btn-link">
                    &larr; Back to HOD Dashboard
                </Link>
                <h1>Department User Management</h1>
                <p>
                    You are managing users for the{" "}
                    <strong>{userInfo.department?.name}</strong>.
                </p>
                {error && <p className="error">{error}</p>}

                <div className="tabs-container">
                    <button
                        className={`tab-button ${activeTab === "viewStudents" ? "active" : ""}`}
                        onClick={() => handleTabChange("viewStudents")}
                    >
                        View Students ({filteredStudents.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === "viewTeachers" ? "active" : ""}`}
                        onClick={() => handleTabChange("viewTeachers")}
                    >
                        View Teachers ({filteredTeachers.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === "create" ? "active" : ""}`}
                        onClick={() => handleTabChange("create")}
                    >
                        + Register New User
                    </button>
                    <button
                        className={`tab-button ${activeTab === "create" ? "active" : ""}`}
                        onClick={() => handleTabChange("createBulk")}
                    >
                        + Register New User
                    </button>
                </div>

                <div className="tab-content">
                    {/* --- REGISTER FORM --- */}
                    {activeTab === "create" && (
                        <div className="form-container">
                            <h2>Register a New User</h2>
                            {success && <p className="success">{success}</p>}
                            <div className="form-group role-selector">
                                <label>Registering As:</label>
                                <div>
                                    <label>
                                        <input
                                            type="radio"
                                            value="student"
                                            checked={formRole === "student"}
                                            onChange={() => handleFormRoleChange("student")}
                                        />{" "}
                                        Student
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            value="teacher"
                                            checked={formRole === "teacher"}
                                            onChange={() => handleFormRoleChange("teacher")}
                                        />{" "}
                                        Teacher
                                    </label>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <input
                                    name="name"
                                    value={formState.name || ""}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    required
                                    disabled={loading}
                                />
                                <input
                                    name="collegeId"
                                    value={formState.collegeId || ""}
                                    onChange={handleChange}
                                    placeholder={
                                        formRole === "student" ? "Univ. Roll No." : "Employee ID"
                                    }
                                    required
                                    disabled={loading}
                                />
                                <input
                                    name="email"
                                    type="email"
                                    value={formState.email || ""}
                                    onChange={handleChange}
                                    placeholder="Email"
                                    required
                                    disabled={loading}
                                />
                                <input
                                    name="password"
                                    type="password"
                                    value={formState.password || ""}
                                    onChange={handleChange}
                                    placeholder="Create Password"
                                    required
                                    autoComplete="new-password"
                                    disabled={loading}
                                />
                                {formRole === "student" && (
                                    <>
                                        <input
                                            name="photo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                                            disabled={loading}
                                        />
                                        <select
                                            name="course"
                                            value={formState.course || ""}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        >
                                            <option value="" disabled>
                                                -- Assign Course --
                                            </option>
                                            {courses.map((c) => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            name="semester"
                                            value={formState.semester || ""}
                                            onChange={handleChange}
                                            required
                                            disabled={!formState.course || semesters.length === 0 || loading}
                                        >
                                            <option value="" disabled>
                                                -- Assign Semester --
                                            </option>
                                            {semesters.map((s) => (
                                                <option key={s._id} value={s._id}>
                                                    Semester {s.number}
                                                </option>
                                            ))}
                                        </select>
                                    </>
                                )}
                                <button type="submit" disabled={loading} className="btn btn-primary">
                                    {loading
                                        ? `Registering...`
                                        : `Register ${formRole.charAt(0).toUpperCase() + formRole.slice(1)}`}
                                </button>
                            </form>
                        </div>
                    )}
                    {activeTab === "createBulk" && (
                        <div className="csv-upload-box">
                            <h3>Bulk Upload via CSV</h3>

                            <select value={csvRole} onChange={(e) => setCsvRole(e.target.value)}>
                                <option value="student">Student CSV</option>
                                <option value="teacher">Teacher CSV</option>
                            </select>

                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setCsvFile(e.target.files[0])}
                            />

                            <button
                                disabled={!csvFile}
                                onClick={async () => {
                                    const fd = new FormData();
                                    fd.append("file", csvFile);
                                    fd.append("role", csvRole);

                                    const res = await api.post("/hod/users/bulk-upload", fd, {
                                        headers: { "Content-Type": "multipart/form-data" },
                                    });

                                    setCsvUploadResult(res.data);
                                    fetchData();
                                }}
                                className="btn btn-primary"
                            >
                                Upload CSV
                            </button>

                            {csvUploadResult && (
                                <pre>{JSON.stringify(csvUploadResult, null, 2)}</pre>
                            )}
                        </div>
                    )}

                    {/* --- VIEW STUDENTS --- */}
                    {activeTab === "viewStudents" && (
                        <>
                            <div className="filter-bar">
                                <label htmlFor="semesterFilter">Sort by Semester:</label>
                                <select
                                    id="semesterFilter"
                                    value={selectedSemesterFilter}
                                    onChange={handleSemesterFilterChange}
                                >
                                    <option value="all">All Semesters</option>
                                    {semestersInDept
                                        .sort((a, b) => a.number - b.number)
                                        .map((sem) => (
                                            <option key={sem._id} value={sem._id}>
                                                Semester {sem.number}
                                            </option>
                                        ))}
                                </select>

                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by student name..."
                                    value={studentSearchQuery}
                                    onChange={handleStudentSearchChange}
                                />

                                <button className="reset-btn" onClick={handleResetStudentFilters}>
                                    Reset
                                </button>
                            </div>

                            {paginatedStudents.length > 0 ? (
                                <>
                                    <div className="user-grid">
                                        {paginatedStudents.map((user) => (
                                            <UserCard
                                                key={user._id}
                                                user={user}
                                                onEdit={openEditModal}
                                                onDelete={handleDeleteUser}
                                            />
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={studentPage}
                                        totalPages={totalStudentPages}
                                        onPageChange={setStudentPage}
                                    />
                                </>
                            ) : (
                                <p className="no-data">No students found.</p>
                            )}
                        </>
                    )}

                    {/* --- VIEW TEACHERS --- */}
                    {activeTab === "viewTeachers" && (
                        <>
                            <div className="filter-bar">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by teacher name..."
                                    value={teacherSearchQuery}
                                    onChange={handleTeacherSearchChange}
                                />
                                <button className="reset-btn" onClick={handleResetTeacherFilters}>
                                    Reset
                                </button>
                            </div>

                            {paginatedTeachers.length > 0 ? (
                                <>
                                    <div className="user-grid">
                                        {paginatedTeachers.map((user) => (
                                            <UserCard
                                                key={user._id}
                                                user={user}
                                                onEdit={openEditModal}
                                                onDelete={handleDeleteUser}
                                            />
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={teacherPage}
                                        totalPages={totalTeacherPages}
                                        onPageChange={setTeacherPage}
                                    />
                                </>
                            ) : (
                                <p className="no-data">No teachers found.</p>
                            )}
                        </>
                    )}
                </div>

                {editingUser && (
                    <EditUserModal
                        user={editingUser}
                        semesters={semestersInDept}
                        onClose={() => setEditingUser(null)}
                        onSave={fetchData}
                        updateUrl={`/hod/users/${editingUser._id}`}
                    />
                )}
            </div>
        </>
    );
};

export default HODManageUsers;
