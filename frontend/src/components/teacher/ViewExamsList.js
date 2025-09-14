import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';

const ViewExamsList = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExams = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/exams');
                setExams(data);
                setError('');
            } catch (err) {
                setError('Failed to fetch exams.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const getExamStatus = (scheduledAt) => {
        const now = new Date();
        const examTime = new Date(scheduledAt);
        if (now < examTime) return "Upcoming";
        else if (now > examTime) return "Completed"
        // Logic for "In Progress" could be more complex (examTime + duration)
        // For now, anything past is considered complete for viewing results;
    };

    return (
        <div className="container">
            <Link to="/teacher/dashboard" className="btn-link"> &larr; Back to Dashboard</Link>
            <h1>My Exams</h1>
            {error && <p className="error">{error}</p>}
            {loading ? <p>Loading exams...</p> : (
                <div className="list-container">
                    {exams.length > 0 ? (
                        <ul className="exam-list">
                            {exams.map(exam => (
                                <li key={exam._id}>
                                    <h3>{exam.title}</h3>
                                    <p>Subject: {exam.subject}</p>
                                    <p>Scheduled: {new Date(exam.scheduledAt).toLocaleString()}</p>
                                    <p>Status: {getExamStatus(exam.scheduledAt)}</p>
                                    <div className="exam-links">
                                        <Link to={`/teacher/results/${exam._id}`} className="btn">View Results</Link>
                                        <Link to={`/teacher/proctor/${exam._id}`} className="btn">Live Proctoring</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p>You have not scheduled any exams yet.</p>}
                </div>
            )}
        </div>
    );
};

export default ViewExamsList;