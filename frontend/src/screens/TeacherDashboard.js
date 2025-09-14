import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock } from './StudentDashboad';

const TeacherDashboard = () => {
    const { userInfo, logout } = useAuth();

    return (
        <div className="container">
            <header className="dashboard-header">
                <div>
                    <h1>Teacher Dashboard</h1>
                    <p>Welcome, {userInfo?.name} ({userInfo?.department.name}))</p>
                </div>
                <Clock />
                <button onClick={logout} className="btn-secondary">Logout</button>
            </header>

            <div className="teacher-actions-grid">
                <Link to="/teacher/questions" className="action-card">
                    <h2>Manage Questions</h2>
                    <p>Create, view, edit, and delete questions for your subject area.</p>
                </Link>
                <Link to="/teacher/exams" className="action-card">
                    <h2>Manage Exams</h2>
                    <p>Monitor live exams, proctor students, and view results of past exams.</p>
                </Link>
            </div>
        </div>
    );
};
export default TeacherDashboard;