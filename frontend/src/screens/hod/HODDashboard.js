import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from 'components/ui/ChangePasswordModal';
import { Clock, getInitials } from 'screens/StudentDashboad';
import { ClockIcon } from 'lucide-react';

const HODDashboard = () => {
    const { userInfo, logout } = useAuth();
    const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
    const initials = getInitials(userInfo?.name);

    return (
        <div className="student-dashboard-container">
            <header className="student-header">
                <div className="student-header-left">
                    <div className="student-avatar">{initials}</div>
                </div>

                <div className="student-header-center">
                    <div className="student-name">{userInfo?.name}</div>
                    <div className="student-department">
                        {userInfo?.department?.name} | {userInfo.college.name}
                    </div>
                    <div className="student-clock">
                        <ClockIcon className="clock-icon" />
                        <Clock />
                    </div>
                </div>

                <div className="student-header-right">
                    <button
                        onClick={() => setIsChangePassModalOpen(true)}
                        className="oval-btn secondary"
                    >
                        Change Password
                    </button>
                    <button onClick={logout} className="oval-btn danger">
                        Logout
                    </button>
                </div>
            </header>
            {isChangePassModalOpen && (
                <ChangePasswordModal
                    onClose={() => setIsChangePassModalOpen(false)}
                />
            )}
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