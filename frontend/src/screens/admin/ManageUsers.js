import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditUserModal from './EditUserModal'; // Ensure this component exists
import Pagination from '../../components/teacher/Pagination'; // Ensure the path to your reusable Pagination component is correct

// A stateless UI component for rendering the list of users in a grid.
const UserList = ({ users, onEdit, onDelete }) => (
    <div className="user-grid">
        {users.map(user => (
            <div key={user._id} className="user-card">
                <div className="user-card-info">
                    <h4>{user.name}</h4>
                    <p>{user.collegeId} | {user.email}</p>
                    <small>{user.department?.name || 'Department: N/A'}</small>
                </div>
                <div className="user-card-actions">
                    <button onClick={() => onEdit(user)} className="action-btn edit-btn">Edit</button>
                    <button onClick={() => onDelete(user._id)} className="action-btn delete-btn">Delete</button>
                </div>
            </div>
        ))}
    </div>
);


// The main page component for User Management.
const ManageUsers = () => {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('viewStudents');
    const [formRole, setFormRole] = useState('student');
    const [formState, setFormState] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data for dropdowns
    const [colleges, setColleges] = useState([]);
    const [degrees, setDegrees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);

    // Data for user lists
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [isLoadingLists, setIsLoadingLists] = useState(true);

    // Edit Modal state
    const [editingUser, setEditingUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Pagination state
    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const usersPerPage = 6; // Configurable items per page

    // --- DATA FETCHING ---
    const fetchAllData = useCallback(async () => {
        setIsLoadingLists(true);
        try {
            const [collegesRes, studentsRes, teachersRes] = await Promise.all([
                api.get('/admin/colleges'),
                api.get('/admin/users/student'),
                api.get('/admin/users/teacher')
            ]);
            setColleges(collegesRes.data);
            setStudents(studentsRes.data);
            setTeachers(teachersRes.data);
            setError('');
        } catch (e) { setError('Failed to load required data.'); console.error(e); }
        finally { setIsLoadingLists(false); }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- CASCADING DROPDOWNS LOGIC (Loop-Free) ---
    const resetForm = useCallback((role) => {
        setFormState({ name: '', collegeId: '', email: '', password: '', role, college: '', degree: '', course: '', department: '', semester: '' });
    }, []);

    const handleFormRoleChange = useCallback((role) => {
        setFormRole(role);
        resetForm(role);
    }, [resetForm]);

    useEffect(() => { // On Tab Change
        setError(''); setSuccess('');
        setStudentPage(1); setTeacherPage(1);
        if (activeTab === 'create') {
            resetForm(formRole);
        }
    }, [activeTab, formRole, resetForm]);

    useEffect(() => { // On College Change
        const collegeId = formState.college;
        setDegrees([]); setCourses([]); setDepartments([]); setSemesters([]);
        if (collegeId) {
            api.get(`/admin/degrees?college=${collegeId}`).then(res => setDegrees(res.data));
            if (formRole === 'teacher') api.get(`/admin/departments?college=${collegeId}`).then(res => setDepartments(res.data));
        }
    }, [formState.college, formRole]);

    useEffect(() => { // On Degree Change
        const degreeId = formState.degree;
        setCourses([]); setDepartments([]); setSemesters([]);
        if (degreeId && formRole === 'student') api.get(`/admin/courses?degree=${degreeId}`).then(res => setCourses(res.data));
    }, [formState.degree, formRole]);

    useEffect(() => { // On Course Change
        const courseId = formState.course;
        setDepartments([]); setSemesters([]);
        if (courseId && formRole === 'student') api.get(`/admin/departments?course=${courseId}`).then(res => setDepartments(res.data));
    }, [formState.course, formRole]);

    useEffect(() => { // On Department Change
        const departmentId = formState.department;
        setSemesters([]);
        if (departmentId && formRole === 'student') api.get(`/admin/semesters?department=${departmentId}`).then(res => setSemesters(res.data));
    }, [formState.department, formRole]);


    // --- CRUD and Form Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'college') Object.assign(newState, { degree: '', course: '', department: '', semester: '' });
            if (name === 'degree') Object.assign(newState, { course: '', department: '', semester: '' });
            if (name === 'course') Object.assign(newState, { department: '', semester: '' });
            if (name === 'department') Object.assign(newState, { semester: '' });
            return newState;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true); setError(''); setSuccess('');
        try {
            await api.post('/admin/users/register', formState);
            setSuccess(`Successfully registered ${formRole}: ${formState.name}!`);
            await fetchAllData();
            resetForm(formRole);
        } catch (err) { setError(err.response?.data?.message || 'Registration failed.'); }
        finally { setIsSubmitting(false); }
    };

    const openEditModal = (user) => { setEditingUser(user); setIsEditModalOpen(true); };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this user?')) {
            try { await api.delete(`/admin/users/${id}`); await fetchAllData(); }
            catch (err) { setError(err.response?.data?.message || "Failed to delete user."); }
        }
    };

    // --- Memoized Pagination Data ---
    const paginatedStudents = useMemo(() => students.slice((studentPage - 1) * usersPerPage, studentPage * usersPerPage), [students, studentPage, usersPerPage]);
    const paginatedTeachers = useMemo(() => teachers.slice((teacherPage - 1) * usersPerPage, teacherPage * usersPerPage), [teachers, teacherPage, usersPerPage]);
    const totalStudentPages = Math.ceil(students.length / usersPerPage);
    const totalTeacherPages = Math.ceil(teachers.length / usersPerPage);


    return (
        <div className="container">
            <Link to="/admin/dashboard" className="btn-link">&larr; Back to Admin Panel</Link>
            <h1>User Management</h1>
            {error && <p className="error">{error}</p>}

            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'viewStudents' ? 'active' : ''}`} onClick={() => setActiveTab('viewStudents')}>Students ({students.length})</button>
                <button className={`tab-button ${activeTab === 'viewTeachers' ? 'active' : ''}`} onClick={() => setActiveTab('viewTeachers')}>Teachers ({teachers.length})</button>
                <button className={`tab-button ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>+ Register New User</button>
            </div>

            <div className="tab-content">
                {activeTab === 'viewStudents' && (isLoadingLists ? <p>Loading students...</p> : <>
                    <UserList users={paginatedStudents} onEdit={openEditModal} onDelete={handleDeleteUser} />
                    <Pagination currentPage={studentPage} totalPages={totalStudentPages} onPageChange={setStudentPage} />
                </>)}

                {activeTab === 'viewTeachers' && (isLoadingLists ? <p>Loading teachers...</p> : <>
                    <UserList users={paginatedTeachers} onEdit={openEditModal} onDelete={handleDeleteUser} />
                    <Pagination currentPage={teacherPage} totalPages={totalTeacherPages} onPageChange={setTeacherPage} />
                </>)}

                {activeTab === 'create' && (
                    <div className="form-container">
                        <h2>Register a New User</h2>
                        {success && <p className="success">{success}</p>}

                        <div className="form-group role-selector">
                            <label>Registering As:</label>
                            <div>
                                <label><input type="radio" value="student" checked={formRole === 'student'} onChange={() => handleFormRoleChange('student')} /> Student</label>
                                <label><input type="radio" value="teacher" checked={formRole === 'teacher'} onChange={() => handleFormRoleChange('teacher')} /> Teacher</label>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="register-user-form">
                            <div className="form-grid">
                                <input name="name" value={formState.name} onChange={handleChange} placeholder="Full Name" required />
                                <input name="collegeId" value={formState.collegeId} onChange={handleChange} placeholder={formRole === 'student' ? "University Roll No." : "Employee ID"} required />
                                <input name="email" type="email" value={formState.email} onChange={handleChange} placeholder="Email Address" required />
                                <input name="password" type="password" value={formState.password} onChange={handleChange} placeholder="Create a password" required autoComplete="new-password" />
                            </div>

                            <select name="college" value={formState.college} onChange={handleChange} required>
                                <option value="" disabled>-- Select College --</option>
                                {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>

                            {formRole === 'student' && (<>
                                <select name="degree" value={formState.degree} onChange={handleChange} required={formRole === 'student'} disabled={!formState.college || degrees.length === 0}>
                                    <option value="">-- Select Degree --</option>
                                    {degrees.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                <select name="course" value={formState.course} onChange={handleChange} required={formRole === 'student'} disabled={!formState.degree || courses.length === 0}>
                                    <option value="">-- Select Course --</option>
                                    {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </>)}

                            <select name="department" value={formState.department} onChange={handleChange} required disabled={departments.length === 0}>
                                <option value="" disabled>-- Select Department --</option>
                                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>

                            {formRole === 'student' && (
                                <select name="semester" value={formState.semester} onChange={handleChange} required={formRole === 'student'} disabled={!formState.department || semesters.length === 0}>
                                    <option value="" disabled>-- Select Semester --</option>
                                    {semesters.map(s => <option key={s._id} value={s._id}>{s.number}</option>)}
                                </select>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : `Register User`}</button>
                        </form>
                    </div>
                )}
            </div>

            {isEditModalOpen && (
                <EditUserModal user={editingUser} onClose={() => setIsEditModalOpen(false)} onSave={fetchAllData} />
            )}
        </div>
    );
};

export default ManageUsers;