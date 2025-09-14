import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HODDashboard = () => {
    const { userInfo, logout } = useAuth();
    return (
        <div className="container">
            <header className="dashboard-header">
                <div><h1>HOD Dashboard</h1><p>Managing Department: {userInfo.department?.name}</p></div>
                <button onClick={logout} className="btn-secondary">Logout</button>
            </header>
            <div className="teacher-actions">
                <Link to="/hod/manage-users" className="action-card">
                    <h2>Manage Department Users</h2>
                    <p>Register, View, Edit, and Delete Teachers and Students in your department.</p>
                </Link>
                <Link to="/hod/exams" className="action-card">
                    <h2>View Department Exams & Results</h2>
                    <p>Monitor all exams scheduled for your department and view aggregated results.</p>
                </Link>
            </div>
        </div>
    );
};
export default HODDashboard;