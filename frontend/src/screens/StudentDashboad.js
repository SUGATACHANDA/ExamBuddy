import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosConfig";
import PermissionModal from "../components/PermissionModal";
import ChangePasswordModal from "components/ui/ChangePasswordModal";

// --- A self-contained, reusable Clock component ---
export const Clock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        // Set up an interval that updates the time every second.
        const timerId = setInterval(() => setTime(new Date()), 1000);

        // Clean up the interval when the component unmounts to prevent memory leaks.
        return () => clearInterval(timerId);
    }, []);

    // Format the time to a user-friendly, locale-specific string (e.g., 10:25:08 PM).
    return <div className="clock">{time.toLocaleTimeString()}</div>;
};

// --- The Main Student Dashboard Component ---
const StudentDashboard = () => {
    // State for the list of exams to display
    const [exams, setExams] = useState([]);
    const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);

    // State to hold the IDs of exams the student has already completed
    const [completedExamIds, setCompletedExamIds] = useState(new Set());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // State for loading and error UI
    const [loading, setLoading] = useState(true);
    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    // State for the pre-exam permission modal
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [targetExamId, setTargetExamId] = useState(null);

    // This function fetches all necessary data from the backend.
    // It's wrapped in `useCallback` so it can be used in useEffect without causing re-renders.
    const fetchData = useCallback(async () => {
        if (!isRefreshing) {
            setLoading(true);
        }
        try {
            // Use Promise.all to fetch both lists of data concurrently for better performance.
            const [allExamsResponse, completedExamsResponse] = await Promise.all([
                api.get("/exams/student/all"),
                api.get("/results/my-completed"), // New endpoint to get completed exam IDs
            ]);

            // 1. Store the set of completed exam IDs. Using a Set is efficient for lookups.
            const completedIds = new Set(completedExamsResponse.data);
            setCompletedExamIds(completedIds);

            // 2. Filter the general list of exams to show only those within the login window.
            const now = new Date();
            const timeAvailableExams = allExamsResponse.data.filter((exam) => {
                const scheduledTime = new Date(exam.scheduledAt);
                const windowStartTime = new Date(
                    scheduledTime.getTime() - (exam.loginWindowStart || 10) * 60000
                );
                const windowEndTime = new Date(
                    scheduledTime.getTime() + (exam.lateEntryWindowEnd || 5) * 60000
                );
                // Return true only if "now" is between the start and end times.
                return now >= windowStartTime && now <= windowEndTime;
            });

            setExams(timeAvailableExams);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            // In a real app, you might set an error state here.
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

    // This effect runs when the component first mounts, and then sets up an interval.
    useEffect(() => {
        fetchData(); // Fetch immediately when the component loads.

        // Set up an interval to refetch data every 30 seconds.
        // This ensures the dashboard stays up-to-date without needing a manual refresh.
        const interval = setInterval(fetchData, 30000);

        // Clean up the interval when the component is unmounted.
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = () => {
        console.log("Manual refresh triggered.");
        setIsRefreshing(true); // Set the refreshing state
        fetchData(); // Immediately call fetch
    };

    const handleStartExamClick = (examId) => {
        setTargetExamId(examId);
        setIsPermissionModalOpen(true);
    };

    const handleConfirmPermissions = () => {
        setIsPermissionModalOpen(false);
        if (targetExamId) {
            // Navigate to the first question of the exam using the robust URL-based routing.
            navigate(`/exam/${targetExamId}/question/0`);
        }
    };

    return (
        <div className="container">
            <header className="dashboard-header">
                <div>
                    <h1>Welcome, {userInfo?.name}</h1>
                    <p>Student Dashboard</p>
                </div>
                <Clock />
                <div>
                    <button
                        onClick={() => setIsChangePassModalOpen(true)}
                        className="btn-secondary"
                    >
                        Change Password
                    </button>
                    <button onClick={logout} className="btn-danger">
                        Logout
                    </button>
                </div>
            </header>
            {isChangePassModalOpen && (
                <ChangePasswordModal onClose={() => setIsChangePassModalOpen(false)} />
            )}

            <h2>Exams Ready for Immediate Start</h2>
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-secondary"
            >
                {isRefreshing ? "Refreshing..." : "Refresh List"}
            </button>

            {loading ? (
                <p>Loading available exams...</p>
            ) : exams.length > 0 ? (
                <ul className="exam-list">
                    {exams.map((exam) => {
                        // Check if the current exam's ID is in our Set of completed IDs
                        const isCompleted = completedExamIds.has(exam._id);

                        return (
                            <li
                                key={exam._id}
                                className={isCompleted ? "exam-completed" : ""}
                            >
                                <h3>
                                    {exam.title} ({exam.subject})
                                </h3>

                                {isCompleted ? (
                                    // If the student has already taken this exam, show a clear status message.
                                    <p className="status-completed">
                                        <strong>Status:</strong> Already Completed
                                    </p>
                                ) : (
                                    // Otherwise, if it's available, show the start button.
                                    <div className="exam-status">
                                        <p>This exam's login window is currently open.</p>
                                        <button
                                            onClick={() => handleStartExamClick(exam._id)}
                                            className="btn btn-primary"
                                        >
                                            Proceed to Security Checks
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                // This message shows if no exams are within their login window right now.
                <p>
                    There are no exams available for you to start at this time. Please
                    check the schedule and return when the login window opens.
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
