import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import EditExamModal from '../components/teacher/EditExamModal';
import { Pagination } from '../components/teacher/ManageQuestion'; // Re-using the Pagination component from ManageQuestions
import { useAuth } from '../context/AuthContext';
import LoadingScreen from 'components/LoadingScreen';
import AlertModal from 'components/ui/AlertModal';
import { useAlert } from 'hooks/useAlert';

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
    const examsPerPage = 2; // You can adjust how many exams show per page
    const [sections, setSections] = useState([{ title: 'Section A', questions: [] }]);

    // --- State for the "Schedule New Exam" form ---
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [examType, setExamType] = useState('timed');
    const [duration, setDuration] = useState(60);
    // const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [enableCameraProctoring, setEnableCameraProctoring] = useState(false);
    const [enableAudioProctoring, setEnableAudioProctoring] = useState(false);
    const [enableFaceVerification, setEnableFaceVerification] = useState(false);

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState("");

    // --- State for the "Edit Exam" modal ---
    const [editingExam, setEditingExam] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [isSemesterLoading, setIsSemesterLoading] = useState(false);
    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    const addSection = () => {
        setSections(prevSections => [
            ...prevSections,
            { title: `Section ${String.fromCharCode(65 + prevSections.length)}`, questions: [] }
        ]);
    };

    const removeSection = (index) => {
        if (sections.length <= 1) {
            openAlert({
                type: "warning",
                title: "Missing Section",
                message: "An exam must have at least one section.",
                confirmText: "Understood",
                showCancel: false,
            });

            return;
        }
        setSections(prevSections => prevSections.filter((_, i) => i !== index));
    };

    const addQuestionToSection = (sectionIndex, questionId) => {
        // First, check if this question is already in ANY section to prevent duplicates
        const isAlreadyAdded = sections.some(sec => sec.questions.includes(questionId));
        if (isAlreadyAdded) {
            openAlert({
                type: "warning",
                title: "Multiple Question in a Section",
                message: "This question has already been added to a section.",
                confirmText: "Understood",
                showCancel: false,
            });
            return;
        }

        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions.push(questionId);
        setSections(updatedSections);
    };

    const filteredQuestions = useMemo(() => {
        if (!selectedSubject) return myQuestions;

        return myQuestions.filter(q => {
            // Case 1: subject stored as ObjectId string
            if (typeof q.subject === "string") {
                return q.subject === selectedSubject;
            }
            // Case 2: subject populated as object
            if (q.subject?._id) {
                return q.subject._id === selectedSubject;
            }
            return false;
        });
    }, [myQuestions, selectedSubject]);
    const removeQuestionFromSection = (sectionIndex, questionId) => {
        const updatedSections = [...sections];
        updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter(id => id !== questionId);
        setSections(updatedSections);
    };

    const getQuestionById = (id) => myQuestions.find(q => q._id === id);


    // --- UPDATED Exam Submission Handler ---
    const handleScheduleExam = async (e) => {
        e.preventDefault();
        setError('');
        // Validate that every section has at least one question
        if (sections.some(sec => sec.questions.length === 0)) {
            return setError("Every section must contain at least one question.");
        }
        setIsScheduling(true);
        try {
            // This is the new, correct payload structure for the backend            
            const payload = {
                title, subject: selectedSubject, semester: selectedSemester,
                scheduledAt: scheduledAt,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                examType,
                duration: examType === 'timed' ? Number(duration) : undefined,
                // Send the sections array, ensuring question objects are just IDs
                sections: sections.map(sec => ({
                    title: sec.title,
                    questions: sec.questions // These are already just IDs
                })),
                enableCameraProctoring,
                enableAudioProctoring,
                enableFaceVerification
            };

            await api.post('/exams', payload);

            // Reset the entire form state after successful creation
            setTitle(''); setSubject(''); setSelectedDepartment(''); setSelectedSemester('');
            setScheduledAt(''); setExamType('timed'); setDuration(60);
            setSections([{ title: 'Section A', questions: [] }]);

            await fetchData();
            setActiveTab('view');
            setCurrentPage(1);

        } catch (err) { setError(err.response?.data?.message || 'Failed to schedule exam.'); }
        finally { setIsScheduling(false); }
    };

    const handleSectionTitleChange = (index, newTitle) => {
        const updatedSections = [...sections];
        updatedSections[index].title = newTitle;
        setSections(updatedSections);
    };

    useEffect(() => {
        api.get("/subjects").then(res => setSubjects(res.data));
    }, []);

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
            setIsSemesterLoading(true);
            api.get(`/data/semesters?department=${selectedDepartment}`)
                .then(res => setSemesters(res.data))
                .catch(e => console.error("Failed to fetch semesters for department", e))
                .finally(() => setIsSemesterLoading(false));
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

    // DELETE: Removes an exam and its results
    const handleDeleteExam = async (id) => {
        if (window.confirm('Are you sure you want to PERMANENTLY delete this exam? All associated student results for this exam will also be deleted.')) {
            setLoading(true)
            try {
                await api.delete(`/exams/${id}`);
                await fetchData(); // Refresh the list after deletion
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete exam.');
            }
            finally {
                setLoading(false)
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
        return "Completed";
    };

    return (
        <>
            {loading && <LoadingScreen />}
            {isSemesterLoading && <LoadingScreen />}
            <div className="container">
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
                            {paginatedExams.length > 0 ? (
                                <>
                                    <ul className="exam-list-teacher">
                                        {paginatedExams.map(exam => (
                                            <li key={exam._id}>
                                                <h3>{exam.title}</h3>
                                                <p><strong>Subject:</strong> {exam.subject?.name || exam.subject}</p>
                                                <p><strong>Scheduled:</strong> {new Date(exam.scheduledAt).toLocaleString()}</p>
                                                <p>
                                                    <strong>Status:</strong> {getExamStatus(exam.scheduledAt)} | <strong>Questions:</strong>{' '}
                                                    {exam.questionCount ?? exam.questions?.length ?? (exam.sections ? exam.sections.reduce((acc, s) => acc + (s.questions?.length ?? 0), 0) : 0)}
                                                </p>
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
                                {/* <div className="form-group"><label>Subject of Exam (e.g., Data Structures, Thermodynamics)</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required /></div> */}
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
                                <div className="form-group proctoring-settings">
                                    <h3>Proctoring Settings</h3>

                                    {/* Face Verifiction */}
                                    <div className="toggle-row">
                                        <label className="toggle-label">Enable Face Verification</label>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={enableFaceVerification}
                                                onChange={(e) => setEnableFaceVerification(e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    {/* Camera Proctoring Toggle */}
                                    <div className="toggle-row">
                                        <label className="toggle-label">Enable Camera Proctoring</label>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={enableCameraProctoring}
                                                onChange={(e) => setEnableCameraProctoring(e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    {/* Audio Proctoring Toggle */}
                                    <div className="toggle-row">
                                        <label className="toggle-label">Enable Audio Proctoring</label>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={enableAudioProctoring}
                                                onChange={(e) => setEnableAudioProctoring(e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                                        (By default, all proctoring features are disabled. By enabling FACE VERIFICATION, AUDIO and VIDEO proctoring will be enabled.)
                                    </small>
                                </div>

                                <hr />
                                <h2 className="qa-title">Question Allocation</h2>
                                {/* ✅ Select Subject FIRST */}
                                <div className="qa-subject-select">
                                    <label>Select Subject</label>
                                    <select
                                        value={subject}
                                        onChange={(e) => {
                                            setSubject(e.target.value)
                                            setSelectedSubject(e.target.value);
                                        }}
                                        required
                                    >
                                        <option value="" disabled>-- Select Subject --</option>
                                        {subjects.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* ✅ Only show question bank AFTER subject chosen */}
                                {selectedSubject ? (
                                    <div className="question-allocator-modern">

                                        {/* LEFT SIDE: Question Bank */}
                                        <div className="qa-panel qa-bank">
                                            <h3>Questions ({filteredQuestions.length})</h3>
                                            <div className="qa-list">
                                                {filteredQuestions.length > 0 ? (
                                                    filteredQuestions.map(q => (
                                                        <div key={q._id} className="qa-item">
                                                            <p className="qa-question">{q.questionText}</p>
                                                            <div className="section-tag-container">
                                                                {sections.map((sec, secIndex) => (
                                                                    <button
                                                                        key={secIndex}
                                                                        type="button"
                                                                        className="section-tag-btn"
                                                                        onClick={() => addQuestionToSection(secIndex, q._id)}
                                                                        title={`Add to ${sec.title}`}
                                                                    >
                                                                        {String.fromCharCode(65 + secIndex)}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="qa-empty">No questions for this subject.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE: Section Panel */}
                                        <div className="qa-panel qa-sections">
                                            <h3>Sections</h3>
                                            {sections.map((section, secIndex) => (
                                                <div key={secIndex} className="qa-section-box">

                                                    {/* Section title + remove */}
                                                    <div className="qa-sec-header">
                                                        <input
                                                            type="text"
                                                            value={section.title}
                                                            onChange={(e) => handleSectionTitleChange(secIndex, e.target.value)}
                                                            className="qa-sec-title"
                                                        />
                                                        <button
                                                            className="qa-remove-sec"
                                                            type="button"
                                                            onClick={() => removeSection(secIndex)}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>

                                                    {/* Allocated Qs */}
                                                    <ul className="qa-section-list">
                                                        {section.questions.map(qId => (
                                                            <li key={qId} className="qa-sec-item">
                                                                <span>{getQuestionById(qId)?.questionText.slice(0, 60)}...</span>
                                                                <button
                                                                    type="button"
                                                                    className="qa-remove-q"
                                                                    onClick={() => removeQuestionFromSection(secIndex, qId)}
                                                                >
                                                                    remove
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}

                                            <button type="button" onClick={addSection} className="qa-add-section-btn">
                                                + Add Section
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="qa-placeholder">Select a subject to load questions</p>
                                )}

                                <hr />
                                <button type="submit" className="btn btn-submit" disabled={isScheduling}>{isScheduling ? 'Scheduling...' : 'Schedule Exam'}</button>
                            </form>
                        </div>
                    )}
                </div>

                {isEditModalOpen && <EditExamModal exam={editingExam} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} />}
            </div>
        </>
    );
};

export default ManageExams;






