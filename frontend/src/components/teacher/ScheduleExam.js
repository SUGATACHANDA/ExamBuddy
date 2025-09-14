import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';

const ScheduleExams = () => {
    const [myQuestions, setMyQuestions] = useState([]);
    const [scheduledExams, setScheduledExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [examType, setExamType] = useState('timed');
    const [duration, setDuration] = useState(60); // Default duration in minutes
    const [selectedQuestions, setSelectedQuestions] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch questions for the multi-select
            const qResponse = await api.get('/questions');
            setMyQuestions(qResponse.data);

            // Fetch already scheduled exams
            const eResponse = await api.get('/exams');
            setScheduledExams(eResponse.data);

            setError('');
        } catch (err) {
            setError('Failed to fetch data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectQuestion = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedQuestions(selectedIds);
    };

    const handleScheduleExam = async (e) => {
        e.preventDefault();
        if (selectedQuestions.length === 0 || !title || !scheduledAt) {
            setError("Please fill all fields and select at least one question.");
            return;
        }

        const scheduledAtUTC = new Date(scheduledAt).toISOString();

        const examData = {
            title,
            scheduledAt: scheduledAtUTC,
            examType,
            duration: examType === 'timed' ? duration : undefined,
            questionIds: selectedQuestions,
        };

        try {
            await api.post('/exams', examData);
            alert('Exam scheduled successfully!');
            setTitle('');
            setScheduledAt('');
            setSelectedQuestions([]);
            fetchData(); // Refresh list of exams
        } catch (err) {
            setError('Failed to schedule exam.');
            console.error(err);
        }
    };

    return (
        <div className="container">
            <Link to="/teacher/dashboard" className="btn-link"> &larr; Back to Dashboard</Link>
            <h1>Schedule a New Exam</h1>
            {error && <p className="error">{error}</p>}

            <div className="form-container">
                <form onSubmit={handleScheduleExam}>
                    <div className="form-group">
                        <label>Exam Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Schedule At</label>
                        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Exam Type</label>
                        <select value={examType} onChange={e => setExamType(e.target.value)}>
                            <option value="timed">Timed</option>
                            <option value="untimed">Untimed</option>
                        </select>
                    </div>
                    {examType === 'timed' && (
                        <div className="form-group">
                            <label>Duration (in minutes)</label>
                            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required min="1" />
                        </div>
                    )}
                    <div className="form-group">
                        <label>Select Questions (Hold Ctrl/Cmd to select multiple)</label>
                        <select multiple value={selectedQuestions} onChange={handleSelectQuestion} style={{ height: "200px" }} required>
                            {myQuestions.map(q => (
                                <option key={q._id} value={q._id}>{q.questionText}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn">Schedule Exam</button>
                </form>
            </div>
        </div>
    );
};

export default ScheduleExams;