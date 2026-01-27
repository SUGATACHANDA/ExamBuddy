import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axiosConfig";
import LoadingScreen from "components/LoadingScreen";
import EditQuestionModal from "./EditQuestionModal";
import { useAlert } from "hooks/useAlert";
import AlertModal, { ALERT_TYPES } from "components/ui/AlertModal";

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

const ManageQuestions = () => {
    // --- STATE MANAGEMENT ---
    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [questionType, setQuestionType] = useState("");

    const [activeTab, setActiveTab] = useState("view");
    const [currentPage, setCurrentPage] = useState(1);
    const questionsPerPage = 4;

    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // ✅ Subject states
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");

    const [questions, setQuestions] = useState([]);

    const [filterSubject, setFilterSubject] = useState("");
    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();


    // const [marks, setMarks] = useState("");

    // ====================== FETCH DATA ======================
    const fetchSubjects = async () => {
        setLoading(true)
        try {
            const res = await api.get("/subjects");

            if (Array.isArray(res.data)) {
                setSubjects(res.data);
            } else {
                console.error("Subjects API did not return array:", res.data);
                setSubjects([]);
            }
        } catch (err) {
            console.error(err);
            setSubjects([]); // ✅ prevent crash
        } finally {
            setLoading(false)
        }
    };

    const fetchQuestions = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/questions");
            setAllQuestions(data);
            setError("");
        } catch {
            setError("Failed to fetch your questions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestions();
        fetchSubjects();
    }, [fetchQuestions]);

    const filteredQuestions = useMemo(() => {
        if (!filterSubject) return allQuestions;
        return allQuestions.filter(q => q.subject?._id === filterSubject);
    }, [filterSubject, allQuestions]);

    const paginatedQuestions = useMemo(() => {
        const start = (currentPage - 1) * questionsPerPage;
        return filteredQuestions.slice(start, start + questionsPerPage);
    }, [filteredQuestions, currentPage, questionsPerPage]);

    const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

    // ====================== SUBJECT ACTIONS ======================
    const handleAddSubject = async () => {
        if (!newSubject.trim()) return (
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "Subject Creation Error",
                message: "Enter Subject Name",
                confirmText: "OK"
            }))
        setLoading(true)
        try {
            const res = await api.post("/subjects", { name: newSubject });
            setSubjects((prev) => [...prev, res.data]);
            setNewSubject("");
            openAlert({
                type: ALERT_TYPES.SUCCESS,
                title: "Subject Added",
                message: "Subject Added successfully.",
                onConfirm: () => {
                    setActiveTab('subjects')
                }
            });
        } catch {
            setError("Subject already exists");
        } finally {
            setLoading(false)
        }
    };

    const handleDeleteSubject = (id) => {
        openAlert({
            type: ALERT_TYPES.WARNING,
            title: "Delete Subject",
            message:
                "Deleting this subject may affect existing questions. Are you sure you want to continue?",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {

                    await api.delete(`/subjects/${id}`);
                    setSubjects((prev) => prev.filter((s) => s._id !== id));

                    openAlert({
                        type: ALERT_TYPES.SUCCESS,
                        title: "Deleted",
                        message: "Subject deleted successfully.",
                    });
                } catch {
                    openAlert({
                        type: ALERT_TYPES.ERROR,
                        title: "Delete Failed",
                        message: "Cannot delete subject. It may be in use.",
                    });
                }
            },
        });
    };

    const addOption = (qIndex) => {
        setQuestions(prev =>
            prev.map((q, i) =>
                i === qIndex
                    ? { ...q, options: [...q.options, ""] }
                    : q
            )
        );
    };

    const deleteOption = (qIndex, optIndex) => {
        setQuestions(prev =>
            prev.map((q, i) =>
                i === qIndex
                    ? { ...q, options: q.options.filter((_, idx) => idx !== optIndex) }
                    : q
            )
        );
    };

    const addNewQuestion = () => {
        if (!selectedSubject) return (
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "Subject Required",
                message: "Please select a subject before adding a question.",
                confirmText: "OK"
            })
        )
        if (!questionType) return (
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "Type Required",
                message: "Please select a question type.",
                confirmText: "OK"
            })
        )

        setQuestions(prev => [
            ...prev,
            {
                questionText: "",
                questionType,
                options: [""], // always start with 2 options
                correctAnswer: "",
                correctAnswers: [],
                expectedAnswer: "",
                marks: 1
            }
        ]);
    };


    const handleQuestionChange = (index, key, value) => {
        const updated = [...questions];
        updated[index][key] = value;
        setQuestions(updated);
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const removeQuestionBlock = (i) => {
        setQuestions(prev => prev.filter((_, idx) => idx !== i));
    };



    const submitAllQuestions = async () => {
        if (!selectedSubject) return (
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "Subject Required",
                message: "Please select a subject before submitting questions.",
                confirmText: "OK"
            })
        )
        if (questions.length === 0) return (
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "No Questions",
                message: "Add at least one question before submitting.",
                confirmText: "OK"
            })
        )

        try {
            await api.post("/questions/bulk", {
                subjectId: selectedSubject,
                questions
            });
            openAlert({
                type: ALERT_TYPES.SUCCESS,
                title: "Questions Added",
                message: "All questions were added successfully.",
                confirmText: "OK",
            });
            setQuestions([]);
            setSelectedSubject("");
            fetchQuestions();
            setActiveTab("view");

        } catch (err) {
            console.error(err);
            setError("Failed to add questions");
        }
    };


    const handleDeleteQuestion = (id) => {
        openAlert({
            type: ALERT_TYPES.WARNING,
            title: "Delete Question",
            message:
                "Are you sure you want to permanently delete this question? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    await api.delete(`/questions/${id}`);

                    if (paginatedQuestions.length === 1 && currentPage > 1) {
                        setCurrentPage((p) => p - 1);
                    }

                    await fetchQuestions();

                    openAlert({
                        type: ALERT_TYPES.SUCCESS,
                        title: "Deleted",
                        message: "Question deleted successfully.",
                    });
                } catch {
                    openAlert({
                        type: ALERT_TYPES.ERROR,
                        title: "Delete Failed",
                        message: "Unable to delete question. Please try again.",
                    });
                }
            },
        });
    };

    const openEditModal = (question) => {
        setEditingQuestion(question);
        setIsEditModalOpen(true);
        setFilterSubject(selectedSubject)
    };


    return (
        <>
            {loading && <LoadingScreen />}

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
                <Link to="/teacher/dashboard" className="btn-link">
                    &larr; Back to Dashboard
                </Link>

                <h1>Manage Questions</h1>
                {error && <p className="error">{error}</p>}

                {/* ✅ TABS */}
                <div className="tabs-container">
                    <button className={`tab-button ${activeTab === "view" ? "active" : ""}`} onClick={() => setActiveTab("view")}>
                        View Questions ({allQuestions.length})
                    </button>

                    <button className={`tab-button ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>
                        + Create Question
                    </button>

                    <button className={`tab-button ${activeTab === "subjects" ? "active" : ""}`} onClick={() => setActiveTab("subjects")}>
                        Manage Subjects
                    </button>
                </div>

                {/* ✅ TAB CONTENT */}
                <div className="tab-content">

                    {/* ✅ VIEW QUESTIONS */}
                    {activeTab === "view" && (
                        <>
                            <div className="form-group" style={{ marginBottom: "15px", maxWidth: "300px" }}>
                                <label>Filter by Subject</label>
                                <select
                                    value={filterSubject}
                                    onChange={(e) => {
                                        setFilterSubject(e.target.value);
                                        setCurrentPage(1); // reset to first page on subject change
                                    }}
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="list-container">
                                {paginatedQuestions.length > 0 ? (
                                    <>
                                        {paginatedQuestions.length > 0 ? (
                                            <>
                                                {paginatedQuestions.map(q => (
                                                    <div key={q._id} className="question-item">
                                                        <p><strong>Q:</strong> {q.questionText}</p>

                                                        {/* ✅ Subject Badge */}
                                                        {q.subject && (
                                                            <span
                                                                style={{
                                                                    background: "#e8f1ff",
                                                                    color: "#0366d6",
                                                                    padding: "3px 8px",
                                                                    borderRadius: "6px",
                                                                    fontSize: "12px",
                                                                    fontWeight: "600",
                                                                    display: "inline-block",
                                                                    marginBottom: "6px"
                                                                }}
                                                            >
                                                                Subject: &nbsp;{q.subject?.name}
                                                            </span>
                                                        )}
                                                        {q.subject && (
                                                            <span
                                                                style={{
                                                                    background: "#e8f1ff",
                                                                    color: "#0366d6",
                                                                    padding: "3px 8px",
                                                                    borderRadius: "6px",
                                                                    fontSize: "12px",
                                                                    fontWeight: "600",
                                                                    display: "inline-block",
                                                                    marginBottom: "6px",
                                                                    marginLeft: "10px"
                                                                }}
                                                            >
                                                                Marks: &nbsp;{q.marks}
                                                            </span>
                                                        )}

                                                        <span
                                                            style={{
                                                                background: "#e8f1ff",
                                                                color: "#0366d6",
                                                                padding: "3px 8px",
                                                                borderRadius: "6px",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                display: "inline-block",
                                                                marginBottom: "6px",
                                                                marginLeft: "10px"
                                                            }}
                                                        >
                                                            Type:&nbsp;
                                                            {q.questionType === "mcq"
                                                                ? "MCQ"
                                                                : q.questionType === "multiple_select"
                                                                    ? "Multiple Select"
                                                                    : "Short Answer"}
                                                        </span>

                                                        <ul>
                                                            {/* ✅ For MCQ or Multiple Select Questions */}
                                                            {(q.questionType === "mcq" || q.questionType === "multiple_select") && q.options?.length > 0 ? (
                                                                q.options.map((opt, i) => {
                                                                    // Determine if option is correct (works for both single & multiple correct answers)
                                                                    const isCorrect =
                                                                        q.questionType === "mcq"
                                                                            ? opt === q.correctAnswer
                                                                            : q.correctAnswers?.includes(opt);

                                                                    return (
                                                                        <li
                                                                            key={i}
                                                                            style={{
                                                                                color: isCorrect ? "green" : "inherit",
                                                                                fontWeight: isCorrect ? "bold" : "normal",
                                                                            }}
                                                                        >
                                                                            {opt}
                                                                            {isCorrect && " (Correct Answer)"}
                                                                        </li>
                                                                    );
                                                                })
                                                            ) : q.questionType === "short_answer" ? (
                                                                // ✅ For Short Answer Type
                                                                <li style={{ color: "green", fontWeight: "bold" }}>
                                                                    Expected Answer: {q.expectedAnswer || "N/A"}
                                                                </li>
                                                            ) : (
                                                                <li style={{ fontStyle: "italic", color: "#888" }}>No options provided</li>
                                                            )}
                                                        </ul>

                                                        <div className="question-actions">
                                                            <button onClick={() => openEditModal(q)} className="btn-secondary">Edit</button>
                                                            <button onClick={() => handleDeleteQuestion(q._id)} className="btn-danger">Delete</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <p style={{ color: "#555", fontStyle: "italic" }}>
                                                {filterSubject
                                                    ? "No questions found for this subject."
                                                    : "You haven't created any questions yet."}
                                            </p>
                                        )}

                                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                                    </>
                                ) : <p>No questions yet</p>}
                            </div>
                        </>
                    )}

                    {/* ✅ CREATE QUESTION */}
                    {activeTab === 'create' && (
                        <div className="form-container">
                            {/* Select Subject */}
                            <div className="form-group">
                                <label>Select Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    required
                                    style={{ marginBottom: "10px" }}
                                >
                                    <option value="" disabled>Select subject</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Select Question Type */}
                            <div className="form-group">
                                <label>Select Question Type</label>
                                <select
                                    value={questionType}
                                    style={{ marginBottom: "10px" }}
                                    onChange={e => {
                                        const type = e.target.value;
                                        setQuestionType(type);
                                        setQuestions([{
                                            questionText: "",
                                            questionType: type,
                                            options: type !== "short_answer" ? [""] : [],
                                            correctAnswer: "",
                                            correctAnswers: [],
                                            expectedAnswer: "",
                                            marks: 1
                                        }]);
                                    }}
                                    required
                                    disabled={!selectedSubject}
                                >
                                    <option value="">Select Type</option>
                                    <option value="mcq">MCQ (Single Answer)</option>
                                    <option value="multiple_select">Multiple Select</option>
                                    <option value="short_answer">Short Answer</option>
                                </select>
                            </div>



                            {/* Questions List */}
                            {questions.map((q, index) => (
                                <div key={index} className="question-block">
                                    {q.questionType === "multiple_select" && (
                                        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                            NB: Marks will be divided equally among all correct answers.
                                        </p>
                                    )}
                                    <label>Question {index + 1}</label>
                                    <textarea
                                        value={q.questionText}
                                        onChange={e => handleQuestionChange(index, "questionText", e.target.value)}
                                    />

                                    {/* ✅ MCQ & Multiple Select */}
                                    {/* ✅ MCQ & Multiple Select */}
                                    {(q.questionType === "mcq" || q.questionType === "multiple_select") && (
                                        <div className="option-section">

                                            {/* ✅ Option Fields */}
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="option-row">
                                                    <input
                                                        type="text"
                                                        className="options-input"
                                                        placeholder={`Option ${i + 1}`}
                                                        value={opt}
                                                        onChange={e => handleOptionChange(index, i, e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="option-delete"
                                                        onClick={() => deleteOption(index, i)}
                                                        disabled={q.options.length <= 1}
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            ))}

                                            {/* ✅ Add Option Button */}
                                            <button
                                                type="button"
                                                onClick={() => addOption(index)}
                                                style={{
                                                    background: "#007bff",
                                                    color: "white",
                                                    padding: "8px 12px",
                                                    borderRadius: "6px",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    marginTop: "8px"
                                                }}
                                            >
                                                ➕ Add Option
                                            </button>

                                            {/* ✅ MCQ Correct Answer */}
                                            {q.questionType === "mcq" && (
                                                <div className="form-group" style={{ marginTop: "12px" }}>
                                                    <label>Select Correct Answer</label>
                                                    <select
                                                        value={q.correctAnswer}
                                                        onChange={(e) => handleQuestionChange(index, "correctAnswer", e.target.value)}
                                                        style={{
                                                            width: "100%",
                                                            padding: "8px",
                                                            border: "1px solid #ccc",
                                                            borderRadius: "5px",
                                                            marginBottom: "10px"
                                                        }}
                                                    >
                                                        <option value="">Select</option>
                                                        {q.options.map((opt, i) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* ✅ Multiple Select */}
                                            {q.questionType === "multiple_select" && (
                                                <div className="form-group" style={{ marginTop: "12px" }}>
                                                    <label>Select Correct Answers (Press Ctrl to select Multiple Options)</label>
                                                    <select
                                                        multiple
                                                        value={q.correctAnswers}
                                                        onChange={(e) => {
                                                            const values = Array.from(e.target.selectedOptions, o => o.value);
                                                            handleQuestionChange(index, "correctAnswers", values);
                                                        }}
                                                        style={{
                                                            width: "100%",
                                                            padding: "8px",
                                                            border: "1px solid #ccc",
                                                            borderRadius: "5px",
                                                            marginBottom: "10px"
                                                        }}
                                                    >
                                                        {q.options.map((opt, i) => (
                                                            <option key={i} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* ✅ Short Answer */}
                                    {q.questionType === "short_answer" && (
                                        <div className="form-group">
                                            <label>Expected Answer</label>
                                            <input
                                                type="text"
                                                value={q.expectedAnswer}
                                                onChange={e => handleQuestionChange(index, "expectedAnswer", e.target.value)}
                                                style={{ marginBottom: "10px" }}
                                            />
                                        </div>
                                    )}

                                    <label>Marks</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={q.marks}
                                        onChange={e => handleQuestionChange(index, "marks", e.target.value)}
                                        style={{ marginBottom: "10px" }}
                                    />

                                    <button
                                        type="button"
                                        className="btn-danger"
                                        onClick={() => removeQuestionBlock(index)}
                                    >
                                        ❌ Remove Question
                                    </button>
                                    <hr />
                                </div>
                            ))}

                            <button type="button" className="btn btn-submit" onClick={submitAllQuestions}>
                                Submit All Questions
                            </button>

                            <button
                                className="floating-add-btn"
                                onClick={addNewQuestion}
                                title="Add New Question"
                                disabled={!selectedSubject || !questionType}
                            >
                                +
                            </button>
                        </div>
                    )}


                    {/* ✅ SUBJECT MANAGEMENT TAB */}
                    {activeTab === "subjects" && (
                        <div className="subject-manager">

                            <div className="subject-header">
                                <h2>Manage Subjects</h2>
                                <p>Add, view, and manage subjects for your question bank</p>
                            </div>

                            <div className="subject-input-box">
                                <input
                                    type="text"
                                    placeholder="Enter subject name"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="subject-input"
                                    required
                                />
                                <button className="btn-add-subject" onClick={handleAddSubject}>
                                    {loading ? "Adding Subject..." : "+ Add Subject"}
                                </button>
                            </div>

                            <div className="subject-list-container">
                                <h3 className="subject-list-title">Your Subjects</h3>
                                {subjects.length === 0 ? (
                                    <p className="no-subject-text">No subjects found. Add one above.</p>
                                ) : (
                                    <ul className="subject-list">
                                        {subjects.map((s) => (
                                            <li key={s._id} className="subject-item">
                                                <span className="subject-name">{s.name}</span>
                                                <button
                                                    className="btn-delete-subject"
                                                    onClick={() => handleDeleteSubject(s._id)}
                                                >
                                                    Delete
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {isEditModalOpen && (
                    <EditQuestionModal
                        question={editingQuestion}
                        onClose={() => setIsEditModalOpen(false)}
                        onSave={fetchQuestions}
                    />
                )}
            </div>
        </>
    );
};

export default ManageQuestions;
