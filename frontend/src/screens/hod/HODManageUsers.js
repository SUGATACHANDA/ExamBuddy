/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import { useAuth } from "../../context/AuthContext";
import EditUserModal from "../admin/EditUserModal";
import UserCard from "../../components/ui/UserCard";
import Pagination from "../../components/teacher/Pagination";

const HODManageUsers = () => {
    const { userInfo } = useAuth();
    const [activeTab, setActiveTab] = useState("viewStudents");
    const [formRole, setFormRole] = useState("student");
    const [formState, setFormState] = useState({});

    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [editingUser, setEditingUser] = useState(null);

    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
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
            // --- FIX: Add the /api/ prefix to all API calls ---
            const [studentsRes, teachersRes, coursesRes] = await Promise.all([
                api.get("/hod/students"),
                api.get("/hod/teachers"),
                api.get("/hod/my-courses"),
            ]);
            setStudents(studentsRes.data);
            setTeachers(teachersRes.data);
            setCourses(coursesRes.data);
        } catch (e) {
            setError("Failed to load required data.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setSemesters([]);
        const newFormState = { ...formState, semester: "" };
        if (newFormState.course) {
            const courseData = courses.find((c) => c._id === newFormState.course);
            if (courseData && courseData.department) {
                // --- FIX: Add the /api/ prefix ---
                api
                    .get(`/data/semesters?department=${courseData.department}`)
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
        const endpoint =
            formRole === "student"
                ? "/hod/users/register-student"
                : "/hod/users/register-teacher";

        try {
            await api.post(endpoint, { ...formState, role: formRole });
            setSuccess(`Successfully registered ${formRole}: ${formState.name}!`);
            await fetchData();
            resetForm(formRole);
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed.");
        }
    };

    const handleDeleteUser = async (id) => {
        if (
            window.confirm(
                "Are you sure you want to delete this user? This is permanent."
            )
        ) {
            try {
                // --- FIX: Add the /api/ prefix ---
                await api.delete(`/hod/users/${id}`);
                await fetchData();
            } catch (e) {
                setError("Failed to delete user.");
            }
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
    };

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

    const paginatedStudents = useMemo(
        () =>
            students.slice(
                (studentPage - 1) * usersPerPage,
                studentPage * usersPerPage
            ),
        [students, studentPage]
    );
    const paginatedTeachers = useMemo(
        () =>
            teachers.slice(
                (teacherPage - 1) * usersPerPage,
                teacherPage * usersPerPage
            ),
        [teachers, teacherPage]
    );
    const totalStudentPages = Math.ceil(students.length / usersPerPage);
    const totalTeacherPages = Math.ceil(teachers.length / usersPerPage);

    return (
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
                    className={`tab-button ${activeTab === "viewStudents" ? "active" : ""
                        }`}
                    onClick={() => handleTabChange("viewStudents")}
                >
                    View Students ({students.length})
                </button>
                <button
                    className={`tab-button ${activeTab === "viewTeachers" ? "active" : ""
                        }`}
                    onClick={() => handleTabChange("viewTeachers")}
                >
                    View Teachers ({teachers.length})
                </button>
                <button
                    className={`tab-button ${activeTab === "create" ? "active" : ""}`}
                    onClick={() => handleTabChange("create")}
                >
                    + Register New User
                </button>
            </div>

            <div className="tab-content">
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
                            />
                            <input
                                name="collegeId"
                                value={formState.collegeId || ""}
                                onChange={handleChange}
                                placeholder={
                                    formRole === "student" ? "Univ. Roll No." : "Employee ID"
                                }
                                required
                            />
                            <input
                                name="email"
                                type="email"
                                value={formState.email || ""}
                                onChange={handleChange}
                                placeholder="Email"
                                required
                            />
                            <input
                                name="password"
                                type="password"
                                value={formState.password || ""}
                                onChange={handleChange}
                                placeholder="Create Password"
                                required
                                autoComplete="new-password"
                            />
                            {formRole === "student" && (
                                <>
                                    <select
                                        name="course"
                                        value={formState.course || ""}
                                        onChange={handleChange}
                                        required
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
                                        disabled={!formState.course || semesters.length === 0}
                                    >
                                        <option value="" disabled>
                                            -- Assign Semester --
                                        </option>
                                        {semesters.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.number}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                            <button type="submit" className="btn btn-primary">
                                Register {formRole}
                            </button>
                        </form>
                    </div>
                )}

                {/* --- THIS IS THE DEFINITIVE FIX FOR THE LISTS --- */}
                {activeTab === "viewStudents" &&
                    (loading ? (
                        <p>Loading...</p>
                    ) : (
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
                    ))}

                {activeTab === "viewTeachers" &&
                    (loading ? (
                        <p>Loading...</p>
                    ) : (
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
                    ))}
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={fetchData}
                    // --- THIS IS THE CRITICAL FIX ---
                    // An HOD must use their own authorized endpoint to update their users.
                    updateUrl={`/hod/users/${editingUser._id}`}
                />
            )}
        </div>
    );
};
export default HODManageUsers;
