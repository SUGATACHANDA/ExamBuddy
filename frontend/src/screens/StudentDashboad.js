/* eslint-disable react-hooks/exhaustive-deps */
// src/screens/StudentDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosConfig";
import PermissionModal from "../components/PermissionModal";
import Countdown from "../components/Countdown";
import { ClockIcon, CalendarIcon, AlertCircleIcon, CheckCircleIcon, RefreshCwIcon } from "lucide-react";
import BiometricRegisterModal from "components/BiometricRegisterModal";
import AlertModal from "../components/ui/AlertModal";
import { useAlert } from "../hooks/useAlert";

// --- Clock Component ---
export const Clock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <span>{time.toLocaleTimeString()}</span>;
};

// --- Get Initials ---
export const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length === 1
        ? parts[0][0].toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const StudentDashboard = () => {
    const [allFetchedExams, setAllFetchedExams] = useState([]);
    const [completedExamIds, setCompletedExamIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [targetExamId, setTargetExamId] = useState(null);
    const [isBiometricModalOpen, setBiometricModalOpen] = useState(false);
    const [biometricVerified, setBiometricVerified] = useState(false);

    const [userLoaded, setUserLoaded] = useState(false);

    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    const { userInfo, logout, updateUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        async function refreshUser() {
            try {
                const fresh = (await api.get("/auth/me")).data;
                updateUser(fresh);
            } finally {
                setUserLoaded(true);
            }
        }
        refreshUser();
    }, []);

    useEffect(() => {
        if (!userLoaded) return;
        if (!userInfo) return;

        const desc = userInfo.faceDescriptor;

        const hasBiometric =
            (Array.isArray(desc) && desc.length > 0) ||
            (desc && typeof desc === "object" && desc.type === "Buffer") ||
            typeof desc === "string";

        setBiometricModalOpen(!hasBiometric);
        setBiometricVerified(hasBiometric);
    }, [userLoaded, userInfo]);


    React.useEffect(() => {
        const checkDisplays = async () => {
            try {
                const result = await window.electronAPI.getDisplayCount();
                if (result > 1) {
                    openAlert({
                        type: "warning",
                        title: "Multiple Displays Detected",
                        message: "Please disconnect external displays to start the exam.",
                        confirmText: "Understood",
                        showCancel: false,
                        onConfirm: () => console.log("acknowledged")
                    });
                }
            } catch (err) {
                console.error("Display check failed:", err);
            }
        };

        checkDisplays();
    }, [openAlert]);


    const fetchData = useCallback(async () => {
        if (!isRefreshing) setLoading(true);
        try {
            const [examsRes, completedRes] = await Promise.all([
                api.get("/exams/student/all"),
                api.get("/results/my-completed"),
            ]);

            // ✅ Ensure exams is always an array
            const fetchedExams = Array.isArray(examsRes.data)
                ? examsRes.data
                : examsRes.data.exams || [];

            // ✅ Ensure completed exam IDs is always an array
            let completedExamIdsArray = [];
            if (Array.isArray(completedRes.data)) {
                completedExamIdsArray = completedRes.data;
            } else if (completedRes.data && typeof completedRes.data === 'object') {
                completedExamIdsArray = completedRes.data.completedExamIds ||
                    completedRes.data.examIds ||
                    completedRes.data.completedExams ||
                    [];
            }

            setAllFetchedExams(fetchedExams);
            setCompletedExamIds(new Set(completedExamIdsArray));
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            setAllFetchedExams([]);
            setCompletedExamIds(new Set());
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

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchData();
    }, [fetchData]);

    const { activeExams, upcomingExams, nearestUpcomingTime } = useMemo(() => {
        const now = new Date();
        const active = [];
        const upcoming = [];
        let nearestTime = null;

        if (!Array.isArray(allFetchedExams)) {
            return { activeExams: [], upcomingExams: [], nearestUpcomingTime: null };
        }

        allFetchedExams.forEach((exam) => {
            if (!exam || !exam._id) return;

            if (completedExamIds.has(exam._id)) return;

            const scheduledTime = new Date(exam.scheduledAt);
            const windowStartTime = new Date(
                scheduledTime.getTime() - (exam.loginWindowStart || 0) * 60000
            );
            const windowEndTime = new Date(
                scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000
            );

            if (now >= windowStartTime && now <= windowEndTime) {
                active.push({ ...exam, windowEndTime });
            } else if (now < windowStartTime) {
                upcoming.push(exam);

                if (!nearestTime || windowStartTime < nearestTime) {
                    nearestTime = windowStartTime;
                }
            }
        });

        return { activeExams: active, upcomingExams: upcoming, nearestUpcomingTime: nearestTime };
    }, [allFetchedExams, completedExamIds]);

    // Auto-refresh logic remains the same...
    useEffect(() => {
        if (!nearestUpcomingTime) return;
        const now = new Date();
        const timeUntilRefresh = nearestUpcomingTime.getTime() - now.getTime();
        if (timeUntilRefresh <= 0) {
            handleRefresh();
            return;
        }
        const timeoutId = setTimeout(() => {
            handleRefresh();
        }, timeUntilRefresh + 1000);
        return () => clearTimeout(timeoutId);
    }, [nearestUpcomingTime, handleRefresh]);

    useEffect(() => {
        if (activeExams.length === 0) return;
        const now = new Date();
        const nearestEndingExam = activeExams.reduce((nearest, exam) => {
            if (!nearest || exam.windowEndTime < nearest.windowEndTime) {
                return exam;
            }
            return nearest;
        }, null);
        if (!nearestEndingExam) return;
        const timeUntilEnd = nearestEndingExam.windowEndTime.getTime() - now.getTime();
        if (timeUntilEnd <= 0) {
            handleRefresh();
            return;
        }
        const timeoutId = setTimeout(() => {
            handleRefresh();
        }, timeUntilEnd + 1000);
        return () => clearTimeout(timeoutId);
    }, [activeExams, handleRefresh]);

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

    const initials = getInitials(userInfo?.name);

    if (!biometricVerified && isBiometricModalOpen) {
        return (
            <>
                <BiometricRegisterModal
                    isOpen={true}
                    onComplete={(freshUser) => {
                        updateUser(freshUser);
                        setBiometricVerified(true);
                        setBiometricModalOpen(false);
                        fetchData();
                    }}
                    allowClose={false}
                />
            </>
        );
    }

    return (
        <div className="professional-dashboard">

            <AlertModal
                {...alertConfig}
                isOpen={alertConfig.isOpen}
                onConfirm={() => {
                    alertConfig.onConfirm?.();
                    closeAlert();
                }}
                onCancel={() => {
                    alertConfig.onCancel?.();
                    closeAlert();
                }}
            />

            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="user-profile">
                        {userInfo.photoUrl ? (
                            <img
                                src={userInfo.photoUrl}
                                alt={userInfo.name}
                                className="user-avatar"
                            />
                        ) : (
                            <div className="avatar-placeholder">{initials}</div>
                        )}
                        <div className="user-info">
                            <h1 className="user-name">{userInfo?.name}</h1>
                            <p className="user-department">{userInfo?.department?.name}</p>
                            <p className="user-department">{userInfo?.college?.name}</p>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="time-display">
                            <ClockIcon size={16} />
                            <Clock />
                        </div>
                        <div className="header-actions">
                            <button
                                onClick={() => navigate(`/student/profile/${userInfo._id}`)}
                                className="header-btn profile-btn"
                            >
                                Profile
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                <div className="dashboard-card">
                    <div className="card-header">
                        <div className="card-title">
                            <h2>Exam Dashboard</h2>
                            <p>Manage your exams and track upcoming schedules</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="refresh-btn"
                        >
                            <RefreshCwIcon size={16} className={isRefreshing ? "spinning" : ""} />
                            {isRefreshing ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>

                    <div className="card-content">
                        {loading ? (
                            <div className="loading-state">
                                <div className="loading-spinner"></div>
                                <p>Loading exams...</p>
                            </div>
                        ) : (
                            <div className="exam-sections">
                                {/* Active Exams */}
                                {activeExams.length > 0 && (
                                    <section className="exam-section">
                                        <div className="section-header">
                                            <AlertCircleIcon className="section-icon active" />
                                            <h3>Available Exams</h3>
                                            <span className="exam-count">{activeExams.length}</span>
                                        </div>
                                        <div className="exam-list">
                                            {activeExams.map((exam) => (
                                                <div key={exam._id} className="exam-card active">
                                                    <div className="exam-info">
                                                        <h4>{exam.title}</h4>
                                                        <p className="exam-subject">{exam.subject?.name || exam.subject}</p>
                                                        <div className="exam-meta">
                                                            <span className="meta-item">
                                                                <CalendarIcon size={14} />
                                                                Scheduled: {new Date(exam.scheduledAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="exam-card-actions">
                                                        <div className="countdown">
                                                            <Countdown
                                                                targetDate={exam.windowEndTime}
                                                                prefixText="Entry closes in:"
                                                                onComplete={handleRefresh}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                window.electronAPI.getDisplayCount().then(count => {
                                                                    if (count > 1) {
                                                                        alert("❌ Cannot start exam.\nMultiple displays detected.\nDisconnect external screens.");
                                                                        return;
                                                                    }
                                                                    handleStartExamClick(exam._id);
                                                                });
                                                            }}
                                                            className="btn-primary"
                                                        >
                                                            Start Exam
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Upcoming Exams */}
                                {upcomingExams.length > 0 && (
                                    <section className="exam-section">
                                        <div className="section-header">
                                            <CalendarIcon className="section-icon upcoming" />
                                            <h3>Upcoming Exams</h3>
                                            <span className="exam-count">{upcomingExams.length}</span>
                                        </div>
                                        <div className="exam-list">
                                            {upcomingExams.map((exam) => {
                                                const windowStartTime = new Date(
                                                    new Date(exam.scheduledAt).getTime() -
                                                    exam.loginWindowStart * 60000
                                                );
                                                return (
                                                    <div key={exam._id} className="exam-card upcoming">
                                                        <div className="exam-info">
                                                            <h4>{exam.title}</h4>
                                                            <p className="exam-subject">{exam.subject?.name || exam.subject}</p>
                                                            <div className="exam-meta">
                                                                <span className="meta-item">
                                                                    <CalendarIcon size={14} />
                                                                    Scheduled: {new Date(exam.scheduledAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="exam-card-actions">
                                                            <div className="countdown">
                                                                <Countdown
                                                                    targetDate={windowStartTime}
                                                                    prefixText="Opens in:"
                                                                    onComplete={handleRefresh}
                                                                />
                                                            </div>
                                                            <button className="btn-secondary" disabled>
                                                                Upcoming
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* Empty State */}
                                {activeExams.length === 0 && upcomingExams.length === 0 && (
                                    <div className="empty-state">
                                        <CheckCircleIcon size={48} className="empty-icon" />
                                        <h3>No Exams Scheduled</h3>
                                        <p>You don't have any active or upcoming exams at the moment.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Results Link */}
                        <div className="card-footer">
                            <Link to="/student/my-results" className="results-link">
                                View Past Exam Results →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <PermissionModal
                isOpen={isPermissionModalOpen}
                onClose={() => setIsPermissionModalOpen(false)}
                onConfirm={handleConfirmPermissions}
            />
        </div>
    );
};

export default StudentDashboard;