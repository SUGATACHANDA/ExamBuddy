import { React, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditQuestionModal from './EditQuestionModal';

// --- Reusable, Self-Contained Pagination Component ---
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    // Don't render pagination controls if there's only one page.
    if (totalPages <= 1) {
        return null;
    }

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <nav className="pagination-container">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
            >
                &larr; Prev
            </button>
            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                >
                    {page}
                </button>
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
            >
                Next &rarr;
            </button>
        </nav>
    );
};


// --- The Main Question Management Component ---
const ManageQuestions = () => {
    // --- STATE MANAGEMENT ---
    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI state for tabs and pagination
    const [activeTab, setActiveTab] = useState('view');
    const [currentPage, setCurrentPage] = useState(1);
    const questionsPerPage = 5; // Configurable number of questions per page

    // State for the "Create New" form
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '', '']);
    const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // State for the "Edit" modal
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // --- DATA FETCHING & DERIVED STATE ---
    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/questions');
            setAllQuestions(data); // Store the full, unfiltered list
            setError('');
        } catch (err) {
            setError('Failed to fetch your questions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // useMemo recalculates the paginated questions only when the source data or page changes, optimizing performance.
    const paginatedQuestions = useMemo(() => {
        const startIndex = (currentPage - 1) * questionsPerPage;
        return allQuestions.slice(startIndex, startIndex + questionsPerPage);
    }, [allQuestions, currentPage, questionsPerPage]);

    const totalPages = Math.ceil(allQuestions.length / questionsPerPage);


    // --- CRUD EVENT HANDLERS ---

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        setError('');
        if (!newQuestionText.trim() || newOptions.some(opt => !opt.trim()) || !newCorrectAnswer) {
            return setError('All fields are required.');
        }
        if (!newOptions.includes(newCorrectAnswer)) {
            return setError('Correct answer must be one of the options.');
        }

        setIsCreating(true);
        try {
            await api.post('/questions', { questionText: newQuestionText, options: newOptions, correctAnswer: newCorrectAnswer });
            setNewQuestionText('');
            setNewOptions(['', '', '', '']);
            setNewCorrectAnswer('');
            await fetchQuestions(); // Re-fetch the updated list
            setActiveTab('view'); // Switch to the view tab
            setCurrentPage(Math.ceil((allQuestions.length + 1) / questionsPerPage)); // Navigate to the last page to see the new question
        } catch (err) {
            setError('Failed to create the question.');
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (window.confirm('Are you sure you want to delete this question? This cannot be undone.')) {
            try {
                await api.delete(`/questions/${id}`);
                // Smart pagination: if deleting the last item on a page, go to the previous page.
                if (paginatedQuestions.length === 1 && currentPage > 1) {
                    setCurrentPage(prevPage => prevPage - 1);
                }
                await fetchQuestions(); // Refresh the list
            } catch (err) {
                setError('Failed to delete the question.');
                console.error(err);
            }
        }
    };

    const openEditModal = (question) => {
        setEditingQuestion(question);
        setIsEditModalOpen(true);
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newOptions];
        updatedOptions[index] = value;
        setNewOptions(updatedOptions);
    };


    // --- RENDER LOGIC ---

    return (
        <div className="container">
            <Link to="/teacher/dashboard" className="btn-link"> &larr; Back to Dashboard</Link>
            <h1>Manage Questions</h1>
            {error && <p className="error">{error}</p>}

            {/* ====== TABS NAVIGATION ====== */}
            <div className="tabs-container">
                <button
                    className={`tab-button ${activeTab === 'view' ? 'active' : ''}`}
                    onClick={() => setActiveTab('view')}>
                    View All Questions ({allQuestions.length})
                </button>
                <button
                    className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}>
                    + Create New Question
                </button>
            </div>

            {/* ====== TAB CONTENT CONTAINER ====== */}
            <div className="tab-content">
                {activeTab === 'view' && (
                    <div className="list-container">
                        {loading ? <p>Loading questions...</p> : paginatedQuestions.length > 0 ? (
                            <>
                                {paginatedQuestions.map(q => (
                                    <div key={q._id} className="question-item">
                                        <p><strong>Q:</strong> {q.questionText}</p>
                                        <ul>
                                            {q.options.map((opt, i) => (
                                                <li key={i} style={{ color: opt === q.correctAnswer ? 'var(--success-color)' : 'inherit', fontWeight: opt === q.correctAnswer ? 'bold' : 'normal' }}>
                                                    {opt}{q.correctAnswer === opt && ' (Correct Answer)'}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="question-actions">
                                            <button onClick={() => openEditModal(q)} className="btn-secondary">Edit</button>
                                            <button onClick={() => handleDeleteQuestion(q._id)} className="btn-danger">Delete</button>
                                        </div>
                                    </div>
                                ))}
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </>
                        ) : (
                            <p>You haven't created any questions yet. Click the "Create New" tab to begin.</p>
                        )}
                    </div>
                )}
                {activeTab === 'create' && (
                    <div className="form-container">
                        <form onSubmit={handleCreateQuestion}>
                            <div className="form-group">
                                <label>Question Text</label>
                                <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} required />
                            </div>
                            {newOptions.map((option, index) => (
                                <div className="form-group" key={index}>
                                    <label>Option {index + 1}</label>
                                    <input type="text" value={option} onChange={(e) => handleOptionChange(index, e.target.value)} required />
                                </div>
                            ))}
                            <div className="form-group">
                                <label>Correct Answer</label>
                                <select value={newCorrectAnswer} onChange={e => setNewCorrectAnswer(e.target.value)} required>
                                    <option value="" disabled>Select the correct option from above</option>
                                    {newOptions.filter(o => o.trim() !== '').map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Question'}</button>
                        </form>
                    </div>
                )}
            </div>

            {/* The Edit Modal, which appears on top of everything when active */}
            {isEditModalOpen && (
                <EditQuestionModal
                    question={editingQuestion}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={fetchQuestions} // Re-fetch all questions after a successful save
                />
            )}
        </div>
    );
};

export default ManageQuestions;