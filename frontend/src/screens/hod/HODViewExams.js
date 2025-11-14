// src/screens/hod/HODViewExams.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/teacher/Pagination'; // Re-use pagination
import LoadingScreen from 'components/LoadingScreen';

const HODViewExams = () => {
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const examsPerPage = 6;

    // Fetch the aggregated data from our new backend endpoint
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/hod/exams-with-results');
            setExams(data);
            setError('');
        } catch (err) {
            setError('Failed to load department exams.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Memoized pagination
    const paginatedExams = useMemo(() => {
        const startIndex = (currentPage - 1) * examsPerPage;
        return exams.slice(startIndex, startIndex + examsPerPage);
    }, [exams, currentPage]);
    const totalPages = Math.ceil(exams.length / examsPerPage);

    const getExamStatus = (scheduledAt) => {
        return new Date() < new Date(scheduledAt) ? "Upcoming" : "Live / Completed";
    };



    return (
        <>
            {loading && <LoadingScreen />}
            <div className="container">
                <Link to="/hod/dashboard" className="btn-link">&larr; Back to HOD Dashboard</Link>
                <h1>Department Exam Overview</h1>
                <p>Viewing all scheduled exams for the <strong>{userInfo.department?.name}</strong>.</p>
                {error && <p className="error">{error}</p>}

                {exams.length > 0 ? (
                    <>
                        <div className="exam-results-grid">
                            {paginatedExams.map(exam => (
                                <div key={exam._id} className="exam-overview-card">
                                    <div className="card-header">
                                        <h3>{exam.title}</h3>
                                        <span className="card-status">{getExamStatus(exam.scheduledAt)}</span>
                                    </div>
                                    <p className="card-subtitle"><strong>Subject:</strong> {exam.subject?.name}</p>
                                    <p className="card-subtitle"><strong>Target Semester:</strong> {exam.semester?.number || 'N/A'}</p>

                                    <div className="card-stats">
                                        <div>
                                            <span>Submissions</span>
                                            <strong>{exam.submissionCount}</strong>
                                        </div>
                                        <div>
                                            <span>Average Score</span>
                                            <strong>{exam.averageScore}%</strong>
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        {/* Link directly to the results page */}
                                        <div className="card-actions">
                                            {/* This button navigates to a route that we have configured to allow both Teachers and HODs */}
                                            <button onClick={() => navigate(`/hod/results/${exam._id}`)} className="btn btn-primary">
                                                View Detailed Results
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                ) : (
                    <p>No exams have been scheduled for your department yet.</p>
                )}
            </div>
        </>
    );
};
export default HODViewExams;