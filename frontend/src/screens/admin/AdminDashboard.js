import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
    const { userInfo, logout } = useAuth();

    return (
        <div className="container">
            <header className="dashboard-header">
                <div>
                    <h1>System Administration</h1>
                    <p>Welcome, {userInfo?.name}. You are logged in as a Super Admin.</p>
                </div>
                <button onClick={logout} className="btn-secondary">Logout</button>
            </header>

            <div className="teacher-actions">
                <Link to="/admin/colleges" className="action-card">
                    <h2>Manage Colleges</h2>
                    <p>Create, edit, and manage all university and college institutions in the system.</p>
                </Link>
                <Link to="/admin/university-affairs" className="action-card">
                    <h2>Manage University Affairs</h2>
                    <p>Register new University Affairs staff and assign them to a college.</p>
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboard;