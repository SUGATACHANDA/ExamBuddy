import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import EditExamModal from '../components/teacher/EditExamModal';
import { Pagination } from '../components/teacher/ManageQuestion'; // Re-using the Pagination component from ManageQuestions
import { useAuth } from '../context/AuthContext';

const ManageExams = () => {
    const navigate = useNavigate();
    const { userInfo } = useAuth();

    // --- STATE MANAGEMENT ---
    const [allExams, setAllExams] = useState([]);
    const [myQuestions, setMyQuestions] = useState([]);
    // State to hold teacher's departments & semesters for dropdowns
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('view');
    const [currentPage, setCurrentPage] = useState(1);
    const examsPerPage = 5; // You can adjust how many exams show per page

    // --- State for the "Schedule New Exam" form ---
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [examType, setExamType] = useState('timed');
    const [duration, setDuration] = useState(60);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [isScheduling, setIsScheduling] = useState(false);

    // --- State for the "Edit Exam" modal ---
    const [editingExam, setEditingExam] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);


    // --- DATA FETCHING LOGIC ---

    // Fetches all necessary data for the page (exams, questions, departments)
    const fetchData = useCallback(async () => {
        try {

            const examsEndpoint = userInfo.role === 'HOD'
                ? '/hod/department-exams' // HODs get ALL exams in the department
                : '/exams'; // Teachers get ONLY the exams they created

            console.log(`Fetching exams using endpoint: ${examsEndpoint}`);
            // setLoading(true); // Can be enabled for a harder loading state
            const [examsRes, questionsRes, deptsRes] = await Promise.all([
                api.get(examsEndpoint),      // Fetch teacher's exams
                api.get('/questions'),   // Fetch teacher's questions for the form
                api.get('/teacher/my-departments') // Assumes endpoint to get teacher's departments
            ]);

            // Sort exams by the most recently scheduled first for better UX
            const sortedExams = examsRes.data.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

            setAllExams(sortedExams);
            setMyQuestions(questionsRes.data);
            setDepartments(deptsRes.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch required data. Please ensure you are assigned to a department.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userInfo.role]);

    // Initial data fetch on component mount
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Effect for CASCADING DROPDOWNS: Fetch semesters when a department is selected
    useEffect(() => {
        setSelectedSemester(''); // Reset semester selection when department changes
        if (selectedDepartment) {
            api.get(`/data/semesters?department=${selectedDepartment}`)
                .then(res => setSemesters(res.data))
                .catch(e => console.error("Failed to fetch semesters for department", e));
        } else {
            setSemesters([]);
        }
    }, [selectedDepartment]);

    // --- PAGINATION LOGIC ---
    const paginatedExams = useMemo(() => {
        const startIndex = (currentPage - 1) * examsPerPage;
        return allExams.slice(startIndex, startIndex + examsPerPage);
    }, [allExams, currentPage, examsPerPage]);

    const totalPages = Math.ceil(allExams.length / examsPerPage);


    // --- CRUD EVENT HANDLERS ---

    // CREATE: Schedules a new exam
    const handleScheduleExam = async (e) => {
        e.preventDefault();
        setError('');
        if (!selectedSemester || selectedQuestions.length === 0) {
            return setError("Please fill all fields, including target semester and questions.");
        }
        setIsScheduling(true);
        try {
            const payload = {
                title,
                subject,
                semester: selectedSemester,
                scheduledAt: new Date(scheduledAt).toISOString(),
                examType,
                duration: examType === 'timed' ? Number(duration) : undefined,
                questionIds: selectedQuestions
            };

            // AGGRESSIVE DEBUGGING: This will now show the correct, filled-in values.
            console.log("--- FINAL PAYLOAD SENT TO BACKEND ---", payload);

            // The API call will now succeed.
            await api.post('/exams', payload);

            // Reset the form after success
            setTitle(''); setSubject(''); setSelectedDepartment(''); setSelectedSemester('');
            setScheduledAt(''); setSelectedQuestions([]); setExamType('timed'); setDuration(60);

            await fetchData();
            setActiveTab('view');
            setCurrentPage(1);

        } catch (err) {
            console.error("Exam scheduling failed:", err.response || err);
            setError(err.response?.data?.message || 'Failed to schedule exam.');
        } finally {
            setIsScheduling(false);
        }
    };

    // DELETE: Removes an exam and its results
    const handleDeleteExam = async (id) => {
        if (window.confirm('Are you sure you want to PERMANENTLY delete this exam? All associated student results for this exam will also be deleted.')) {
            try {
                await api.delete(`/exams/${id}`);
                await fetchData(); // Refresh the list after deletion
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete exam.');
            }
        }
    };
    // UPDATE: Opens the edit modal
    const openEditModal = (exam) => {
        setEditingExam(exam);
        setIsEditModalOpen(true);
    };

    // Helper to determine exam status
    const getExamStatus = (scheduledAt) => {
        const now = new Date();
        const examTime = new Date(scheduledAt);
        if (now < examTime) return "Upcoming";
        // You can add more complex logic here (e.g., checking duration to see if it's "In Progress")
        return "Live / Completed";
    };

    return (
        <div className="container">
            <Link to="/teacher/dashboard" className="btn-link"> &larr; Back to Dashboard</Link>
            <h1>Exam Management</h1>
            {error && <p className="error">{error}</p>}

            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}> My Scheduled Exams ({allExams.length}) </button>
                <button className={`tab-button ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}> + Schedule New Exam </button>
            </div>

            <div className="tab-content">
                {activeTab === 'view' && (
                    <div className="list-container">
                        {loading ? <p>Loading exams...</p> : paginatedExams.length > 0 ? (
                            <>
                                <ul className="exam-list-teacher">
                                    {paginatedExams.map(exam => (
                                        <li key={exam._id}>
                                            <h3>{exam.title}</h3>
                                            <p><strong>Subject:</strong> {exam.subject}</p>
                                            <p><strong>Scheduled:</strong> {new Date(exam.scheduledAt).toLocaleString()}</p>
                                            <p><strong>Status:</strong> {getExamStatus(exam.scheduledAt)} | <strong>Questions:</strong> {exam.questionCount}</p>
                                            <div className="exam-actions">
                                                <button onClick={() => navigate(`/teacher/results/${exam._id}`)} className="btn btn-primary">Results</button>
                                                <button onClick={() => navigate(`/teacher/proctor/${exam._id}`)} className="btn-success">Proctor</button>
                                                <button onClick={() => openEditModal(exam)} className="btn-secondary">Edit</button>
                                                <button onClick={() => handleDeleteExam(exam._id)} className="btn-danger">Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            </>
                        ) : (<p>You haven't scheduled any exams yet. Click the "Schedule New Exam" tab to begin.</p>)}
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="form-container">
                        <h2>Details for New Exam</h2>
                        <form onSubmit={handleScheduleExam}>
                            <div className="form-group"><label>Exam Title (e.g., Midterm 1, Final Exam)</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required /></div>
                            <div className="form-group"><label>Subject of Exam (e.g., Data Structures, Thermodynamics)</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required /></div>
                            <div className="form-group"><label>Target Department</label>
                                <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} required>
                                    <option value="" disabled>Select department</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Target Semester</label>
                                <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} required disabled={!selectedDepartment}>
                                    <option value="" disabled>Select semester</option>
                                    {semesters.map(s => <option key={s._id} value={s._id}>{s.number}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Schedule At (in your local time)</label><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required /></div>
                            <div className="form-group"><label>Exam Type</label><select value={examType} onChange={e => setExamType(e.target.value)}><option value="timed">Timed</option><option value="untimed">Untimed</option></select></div>
                            {examType === 'timed' && <div className="form-group"><label>Duration (in minutes)</label><input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} required min="1" /></div>}
                            <div className="form-group">
                                <label>Select Questions from your Question Bank ({selectedQuestions.length} selected)</label>
                                <select multiple value={selectedQuestions} onChange={e => setSelectedQuestions(Array.from(e.target.selectedOptions, option => option.value))} style={{ height: "250px" }} required>
                                    {myQuestions.map(q => <option key={q._id} value={q._id}>{q.questionText}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-submit" disabled={isScheduling}>{isScheduling ? 'Scheduling...' : 'Schedule Exam'}</button>
                        </form>
                    </div>
                )}
            </div>

            {isEditModalOpen && <EditExamModal exam={editingExam} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} />}
        </div>
    );
};

export default ManageExams;