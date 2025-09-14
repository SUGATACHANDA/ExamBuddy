import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UniversityAffairsDashboard = () => {
    const { userInfo, logout } = useAuth();
    return (
        <div className="container">
            <header className="dashboard-header">
                <div><h1>University Affairs Panel</h1><p>Welcome, {userInfo?.name} | College: {userInfo.college?.name}</p></div>
                <button onClick={logout} className="btn-secondary">Logout</button>
            </header>
            <div className="teacher-actions">
                <Link to="/ua/hierarchy" className="action-card">
                    <h2>Manage Academic Structure</h2>
                    <p>Create, Edit, & Delete Degrees, Courses, Departments, and Semesters for your college.</p>
                </Link>
                <Link to="/ua/hods" className="action-card">
                    <h2>Manage HODs</h2>
                    <p>Register new Head of Department users and view existing ones within your college.</p>
                </Link>
            </div>
        </div>
    );
};
export default UniversityAffairsDashboard;