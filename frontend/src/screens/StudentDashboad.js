// src/screens/StudentDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosConfig";
import PermissionModal from "../components/PermissionModal";
import ChangePasswordModal from "components/ui/ChangePasswordModal";
import Countdown from "../components/Countdown";
// --- Clock component ---
export const Clock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <div className="clock">{time.toLocaleTimeString()}</div>;
};

const StudentDashboard = () => {
    const [allFetchedExams, setAllFetchedExams] = useState([]);
    const [completedExamIds, setCompletedExamIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [targetExamId, setTargetExamId] = useState(null);

    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    // ✅ Fetch exams + completed exams
    const fetchData = useCallback(async () => {
        if (!isRefreshing) setLoading(true);
        try {
            const [examsRes, completedRes] = await Promise.all([
                api.get("/exams/student/all"),
                api.get("/results/my-completed")
            ]);
            setAllFetchedExams(examsRes.data);
            setCompletedExamIds(new Set(completedRes.data));
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    // ✅ categorize exams into active and upcoming
    const { activeExams, upcomingExams } = useMemo(() => {
        const now = new Date();
        const active = [];
        const upcoming = [];

        allFetchedExams.forEach((exam) => {
            if (completedExamIds.has(exam._id)) return;

            const scheduledTime = new Date(exam.scheduledAt);
            const windowStartTime = new Date(
                scheduledTime.getTime() - (exam.loginWindowStart) * 60000
            );
            const windowEndTime = new Date(scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000);
            if (now >= windowStartTime && now <= windowEndTime) {
                active.push({ ...exam, windowEndTime });
            }
            else if (now >= windowStartTime) {
                active.push(exam);
            } else {
                upcoming.push(exam);
            }
        });

        return { activeExams: active, upcomingExams: upcoming };
    }, [allFetchedExams, completedExamIds]);

    const handleStartExamClick = (examId) => {
        setTargetExamId(examId);
        setIsPermissionModalOpen(true);
    };

    const handleConfirmPermissions = () => {
        setIsPermissionModalOpen(false);
        if (targetExamId) {
            navigate(`/exam/${targetExamId}/question/0`);
        }
    };

    return (
        <div className="container">
            {/* --- HEADER --- */}
            <header className="dashboard-header">
                <div>
                    <h1>Welcome, {userInfo?.name}</h1>
                    <p>Student Dashboard</p>
                </div>
                <Clock />
                <div>
                    <button
                        onClick={() => setIsChangePassModalOpen(true)}
                        className="changePasswordButton btn-secondary"
                    >
                        Change Password
                    </button>
                    <button onClick={logout} className="btn-danger">
                        Logout
                    </button>
                </div>
            </header>

            {isChangePassModalOpen && (
                <ChangePasswordModal
                    onClose={() => setIsChangePassModalOpen(false)}
                />
            )}

            {/* --- ACTIVE EXAMS SECTION --- */}
            <h2>Exams Open for Entry</h2>
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-secondary"
            >
                {isRefreshing ? "Refreshing..." : "Refresh List"}
            </button>
            {loading ? (
                <p>Loading...</p>
            ) : activeExams.length > 0 ? (
                <ul className="exam-list">
                    {activeExams.map((exam) => {
                        return (
                            <li key={exam._id} className="exam-card-active">
                                <h3>{exam.title}</h3>
                                <p>
                                    This exam is open for entry now. Please proceed to the
                                    security checks.
                                </p>
                                <Countdown
                                    targetDate={exam.windowEndTime}
                                    prefixText="Entry window closes in:"
                                />
                                <button
                                    onClick={() => handleStartExamClick(exam._id)}
                                    className="btn-primary"
                                >
                                    Start Exam
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p>There are no exams open for entry at this moment.</p>
            )}

            <hr className="divider" />

            {/* --- UPCOMING EXAMS SECTION --- */}
            <h2>Exams Starting Soon</h2>
            {loading ? (
                <p>Loading...</p>
            ) : upcomingExams.length > 0 ? (
                <ul className="exam-list">
                    {upcomingExams.map((exam) => {
                        const windowStartTime = new Date(
                            new Date(exam.scheduledAt).getTime() -
                            (exam.loginWindowStart) * 60000
                        );
                        return (
                            <li key={exam._id} className="exam-card-upcoming">
                                <h3>{exam.title}</h3>
                                <p>
                                    Scheduled for:{" "}
                                    {new Date(
                                        exam.scheduledAt
                                    ).toLocaleString()}
                                </p>
                                <div className="countdown-container">
                                    <span>Entry opens in:</span>
                                    <Countdown targetDate={windowStartTime} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p>
                    There are no other exams scheduled for you at this time.
                </p>
            )}

            <div className="dashboard-actions">
                <Link to="/student/my-results" className="action-card-link">
                    View Past Exam Results
                </Link>
            </div>

            <PermissionModal
                isOpen={isPermissionModalOpen}
                onClose={() => setIsPermissionModalOpen(false)}
                onConfirm={handleConfirmPermissions}
            />
        </div>
    );
};

export default StudentDashboard;
