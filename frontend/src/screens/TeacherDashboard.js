import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, getInitials } from './StudentDashboad';
import ChangePasswordModal from 'components/ui/ChangePasswordModal';
import { ClockIcon } from 'lucide-react';

const TeacherDashboard = () => {
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
                        Department of {userInfo?.department?.name}
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