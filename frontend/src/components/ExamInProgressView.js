// ExamInProgressView.js
import React from "react";
import Timer from "./Timer";
import QuestionPalette from "./QuestionPalette";
import { useAuth } from "../context/AuthContext";
import InstructionsModal from "./InstructionsModal";
import { useNavigate } from "react-router-dom";

const ExamInProgressView = ({
    exam,
    answers,
    dispatch,
    submitExam,
    localVideoRef,
    currentSectionIndex,
    currentQuestionIndex,
    examActionTypes,
}) => {
    const { userInfo } = useAuth();
    const [isInstructionsOpen, setIsInstructionsOpen] = React.useState(false);
    const [isMarked, setIsMarked] = React.useState(false);
    const navigate = useNavigate();

    // --- WATERMARK COMPONENT ---
    const Watermark = ({
        text,
        rows,
        cols,
        fontSize,
        opacity,
    }) => {
        const containerStyle = {
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
            background: "transparent",
        };

        const marks = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const left = `${(c / (cols - 1)) * 100}%`;
                const top = `${(r / (rows - 1)) * 100}%`;
                const style = {
                    position: "absolute",
                    left,
                    top,
                    transform: "translate(-50%, -50%) rotate(-15deg)",
                    fontSize: `${fontSize}px`,
                    fontWeight: 700,
                    opacity,
                    color: "rgba(0,0,0,1)",
                    whiteSpace: "nowrap",
                    letterSpacing: "2px",
                };
                marks.push(
                    <span aria-hidden="true" key={`${r}-${c}`} style={style}>
                        {text}
                    </span>
                );
            }
        }

        return (
            <div style={containerStyle} aria-hidden="true">
                {marks}
            </div>
        );
    };

    const getStudentId = () => {
        return (
            userInfo?.collegeId ||
            userInfo?.studentId ||
            userInfo?.id ||
            userInfo?._id ||
            "STUDENT"
        );
    };

    const handleProceedToReview = () => {
        const studentId = getStudentId();

        try {
            sessionStorage.setItem(
                `lastExamLocation_${exam._id}_${studentId}`,
                JSON.stringify({
                    secIndex: currentSectionIndex,
                    qIndex: currentQuestionIndex,
                })
            );
            sessionStorage.setItem(
                `examAnswers_${exam._id}_${studentId}`,
                JSON.stringify(answers)
            );
        } catch (e) {
            console.warn("Failed to save exam progress to sessionStorage", e);
        }

        navigate(`/exam/review/${exam._id}`, {
            state: { exam, answers },
        });
    };

    // Track "mark for review" state
    React.useEffect(() => {
        if (
            !exam ||
            !exam.sections[currentSectionIndex]?.questions[currentQuestionIndex]
        )
            return;
        const currentQuestion =
            exam.sections[currentSectionIndex].questions[currentQuestionIndex];
        const answer = answers.find((a) => a.questionId === currentQuestion._id);
        setIsMarked(
            answer?.status === "markedForReview" ||
            answer?.status === "answeredAndMarked"
        );
    }, [exam, answers, currentSectionIndex, currentQuestionIndex]);

    if (
        !exam ||
        !exam.sections[currentSectionIndex]?.questions[currentQuestionIndex]
    ) {
        return (
            <div className="status-container">
                <h2>Loading exam...</h2>
            </div>
        );
    }

    const currentSection = exam.sections[currentSectionIndex];
    const currentQuestion = currentSection.questions[currentQuestionIndex];

    const handleAnswerSelect = (option) =>
        dispatch({
            type: examActionTypes.ANSWER_QUESTION,
            payload: { questionId: currentQuestion._id, option },
        });
    const handleMarkForReview = () =>
        dispatch({
            type: examActionTypes.MARK_FOR_REVIEW,
            payload: { questionId: currentQuestion._id, isMarked: !isMarked },
        });
    const handleClearResponse = () =>
        dispatch({
            type: examActionTypes.CLEAR_RESPONSE,
            payload: { questionId: currentQuestion._id },
        });
    const handleSectionSelect = (index) =>
        dispatch({
            type: examActionTypes.GOTO_QUESTION,
            payload: { sectionIndex: index, questionIndex: 0 },
        });
    const handlePaletteNavigate = (qIndex) =>
        dispatch({
            type: examActionTypes.GOTO_QUESTION,
            payload: { sectionIndex: currentSectionIndex, questionIndex: qIndex },
        });

    const selectedAnswerValue =
        answers.find((a) => a.questionId === currentQuestion._id)
            ?.submittedAnswer || null;

    const questionPanelStyle = {
        position: "relative",
        zIndex: 1,
        padding: "28px",
        minHeight: "320px",
        background: "transparent",
        overflow: "hidden",
    };

    const questionTextStyle = { position: "relative", zIndex: 2 };

    const isLastQuestionOverall =
        currentSectionIndex === exam.sections.length - 1 &&
        currentQuestionIndex === currentSection.questions.length - 1;

    return (
        <div className="exam-layout-final">
            {isInstructionsOpen && (
                <InstructionsModal onClose={() => setIsInstructionsOpen(false)} />
            )}

            {/* --- TOP HEADER --- */}
            <header className="exam-header-final">
                <h1 className="exam-title">{exam.title}</h1>
                <div className="exam-header-meta-final">
                    <span className="student-name">Name: {userInfo?.name}</span>
                    <button
                        onClick={() => setIsInstructionsOpen(true)}
                        className="btn-instructions"
                    >
                        Instructions
                    </button>
                    {exam.examType === "timed" && (
                        <Timer initialMinutes={exam.duration} onTimeUp={submitExam} />
                    )}
                </div>
            </header>

            {/* --- SECTION NAVIGATION --- */}
            <div className="section-tabs-final">
                {exam.sections.map((section, index) => (
                    <button
                        key={index}
                        className={`section-tab-button ${index === currentSectionIndex ? "active" : ""
                            }`}
                        onClick={() => handleSectionSelect(index)}
                    >
                        {section.title}
                    </button>
                ))}
            </div>

            {/* --- MAIN QUESTION PANEL --- */}
            <main className="question-panel-final" style={questionPanelStyle}>
                <Watermark
                    text={getStudentId()}
                    rows={5}
                    cols={4}
                    fontSize={40}
                    opacity={0.15}
                />

                <div style={questionTextStyle}>
                    <p className="question-progress-final">
                        Question {currentQuestionIndex + 1}
                    </p>
                    <h2 className="question-text-final">
                        {currentQuestion.questionText}
                    </h2>
                    <div className="options">
                        {currentQuestion.options.map((option, index) => {
                            const isChecked = selectedAnswerValue === option;
                            return (
                                <label
                                    key={index}
                                    className={`option-label ${isChecked ? "selected" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        className="option-input"
                                        name={`q-${currentQuestion._id}`}
                                        value={option}
                                        checked={isChecked}
                                        onChange={() => handleAnswerSelect(option)}
                                    />
                                    <span className="option-checkmark"></span>
                                    <span className="option-text">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* --- RIGHT SIDEBAR --- */}
            <aside className="right-sidebar-final">
                <QuestionPalette
                    section={currentSection}
                    answers={answers}
                    currentQuestionId={currentQuestion._id}
                    onNavigate={handlePaletteNavigate}
                />
            </aside>

            {/* --- FOOTER --- */}
            <footer className="question-footer-final">
                <div className="footer-left-actions">
                    <button
                        onClick={handleMarkForReview}
                        className={`btn btn-secondary ${isMarked ? "active" : ""}`}
                    >
                        {isMarked ? "Unmarked" : "Mark for Review"}
                    </button>
                    <button onClick={handleClearResponse} className="btn-secondary">
                        Clear Response
                    </button>
                </div>
                <div className="footer-right-actions">
                    {!isLastQuestionOverall && (
                        <button
                            onClick={() => dispatch({ type: examActionTypes.NEXT_QUESTION })}
                            className="btn-primary"
                        >
                            Save & Next
                        </button>
                    )}
                    <button onClick={handleProceedToReview} className="btn-submit">
                        Submit Exam
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ExamInProgressView;
