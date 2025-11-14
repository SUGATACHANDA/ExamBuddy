// ExamInProgressView.js
import React from "react";
import Timer from "./Timer";
import QuestionPalette from "./QuestionPalette";
import { useAuth } from "../context/AuthContext";
import InstructionsModal from "./InstructionsModal";
import { useNavigate } from "react-router-dom";
import "react-simple-keyboard/build/css/index.css";
import { Info } from "lucide-react";

const SectionTabWithInfo = ({
    section,
    sectionIndex,
    isActive,
    onSectionSelect,
    answers,
    currentSectionIndex
}) => {
    const [showTooltip, setShowTooltip] = React.useState(false);

    // Calculate question statuses for this section
    const questionStatuses = React.useMemo(() => {
        const statusCount = {
            answered: 0,
            markedForReview: 0,
            answeredAndMarked: 0,
            notAnswered: 0,
            notVisited: 0
        };

        section.questions.forEach((question, qIndex) => {
            const answer = answers.find(a => a.questionId === question._id);

            if (!answer) {
                statusCount.notVisited++;
            } else {
                switch (answer.status) {
                    case 'answered':
                        statusCount.answered++;
                        break;
                    case 'markedForReview':
                        statusCount.markedForReview++;
                        break;
                    case 'answeredAndMarked':
                        statusCount.answeredAndMarked++;
                        break;
                    case 'notAnswered':
                    default:
                        statusCount.notAnswered++;
                        break;
                }
            }
        });

        return statusCount;
    }, [section.questions, answers]);

    return (
        <div className="section-tab-with-info">
            <button
                className={`section-tab-button ${isActive ? "active" : ""}`}
                onClick={() => onSectionSelect(sectionIndex)}
            >
                {section.title}
            </button>

            <button
                className="section-info-button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title="Section Status"
            >
                i
            </button>

            <div className={`section-status-tooltip ${showTooltip ? "show" : ""}`}>
                <h4>Section Status</h4>
                <ul className="section-status-list">
                    <li className="section-status-item">
                        <span className="status-indicator status-answered"></span>
                        <span>Answered: {questionStatuses.answered}</span>
                    </li>
                    <li className="section-status-item">
                        <span className="status-indicator status-markedForReview"></span>
                        <span>Marked for Review: {questionStatuses.markedForReview}</span>
                    </li>
                    <li className="section-status-item">
                        <span className="status-indicator status-answeredAndMarked"></span>
                        <span>Answered & Marked: {questionStatuses.answeredAndMarked}</span>
                    </li>
                    <li className="section-status-item">
                        <span className="status-indicator status-notAnswered"></span>
                        <span>Not Answered: {questionStatuses.notAnswered}</span>
                    </li>
                    <li className="section-status-item">
                        <span className="status-indicator status-notVisited"></span>
                        <span>Not Visited: {questionStatuses.notVisited}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

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

    // --- SHORT ANSWER / KEYBOARD STATE (NEW / FIXED) ---
    // shortAnswer: local single-source-of-truth for the current question's short answer
    const [shortAnswer, setShortAnswer] = React.useState("");

    const [timeLeft, setTimeLeft] = React.useState(() => {
        const savedTime = localStorage.getItem(`exam_time_${exam._id}_${userInfo?.id}`);
        return savedTime ? parseInt(savedTime) : exam.duration * 60;
    });

    const totalDurationSec = exam.duration * 60;
    const halfDurationSec = totalDurationSec / 2;
    const canSubmit = timeLeft <= halfDurationSec;
    const remainingToUnlock = Math.max(timeLeft - halfDurationSec, 0);

    // Format time function
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [
            hrs.toString().padStart(2, "0"),
            mins.toString().padStart(2, "0"),
            secs.toString().padStart(2, "0"),
        ].join(":");
    };

    // Timer effect
    React.useEffect(() => {
        if (!exam || exam.examType !== "timed") return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    submitExam();
                    return 0;
                }
                const newTime = prev - 1;
                localStorage.setItem(`exam_time_${exam._id}_${userInfo?.id}`, newTime.toString());
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [exam, submitExam, userInfo?.id]);




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

    const currentSection = exam.sections[currentSectionIndex];
    const currentQuestion = currentSection.questions[currentQuestionIndex];
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


    React.useEffect(() => {
        // When current question changes, load its saved short answer (if any)
        if (!currentQuestion) return;
        if (currentQuestion.questionType !== "short_answer") {
            // close keyboard and reset when switching away from short answer question
            setShortAnswer("");

            return;
        }

        const saved = answers.find((a) => a.questionId === currentQuestion._id);
        const val = saved?.submittedAnswer ?? "";
        setShortAnswer(typeof val === "string" ? val : ""); // ensure string
        // ensure keyboard shows current value if opened
        // (VirtualNumericKeyboard will receive initialValue prop)
    }, [currentQuestion._id, currentQuestion.questionType, answers, currentQuestion]);

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
        overflow: "auto",
    };



    const questionTextStyle = { position: "relative", zIndex: 2 };

    const isLastQuestionOverall =
        currentSectionIndex === exam.sections.length - 1 &&
        currentQuestionIndex === currentSection.questions.length - 1;


    return (
        <div className="exam-layout-final exam-fullscreen-layout">
            {isInstructionsOpen && (
                <InstructionsModal onClose={() => setIsInstructionsOpen(false)} />
            )}

            {/* --- TOP HEADER --- */}
            <header className="exam-header-final">
                <h1 className="exam-title">{exam.title} ({exam.subject?.name || exam.subject})</h1>
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
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="exam-header-video"
                        hidden
                    />
                </div>
            </header>

            {/* --- SECTION NAVIGATION --- */}
            <div className="section-tabs-final">
                {exam.sections.map((section, index) => {
                    // Calculate question statuses for this section
                    const questionStatuses = {
                        answered: 0,
                        markedForReview: 0,
                        answeredAndMarked: 0,
                        notAnswered: 0,
                        total: section.questions.length
                    };

                    section.questions.forEach((question) => {
                        const answer = answers.find(a => a.questionId === question._id);

                        if (!answer) {
                            questionStatuses.notVisited++;
                        } else {
                            switch (answer.status) {
                                case 'answered':
                                    questionStatuses.answered++;
                                    break;
                                case 'markedForReview':
                                    questionStatuses.markedForReview++;
                                    break;
                                case 'answeredAndMarked':
                                    questionStatuses.answeredAndMarked++;
                                    break;
                                case 'notAnswered':
                                default:
                                    questionStatuses.notAnswered++;
                                    break;
                            }
                        }
                    });

                    return (
                        <div key={index} className="section-tab-with-info">
                            <button
                                className={`section-tab-button ${index === currentSectionIndex ? "active" : ""}`}
                                onClick={() => handleSectionSelect(index)}
                            >
                                {section.title}
                                {/* <Info
                                    className="section-info-button"
                                    title="Hover to view section status"
                                    size={10}
                                /> */}
                            </button>


                            <div className="section-status-tooltip">
                                <h4>Section: {section.title}</h4>
                                <ul className="section-status-list">
                                    <li className="section-status-item">
                                        <span className="status-indicator status_answered"></span>
                                        <span>Answered: {questionStatuses.answered}</span>
                                    </li>
                                    <li className="section-status-item">
                                        <span className="status-indicator status-markedForReview"></span>
                                        <span>Marked for Review: {questionStatuses.markedForReview}</span>
                                    </li>
                                    <li className="section-status-item">
                                        <span className="status-indicator status-answeredAndMarked"></span>
                                        <span>Answered & Marked: {questionStatuses.answeredAndMarked}</span>
                                    </li>
                                    <li className="section-status-item">
                                        <span className="status-indicator status-notAnswered"></span>
                                        <span>Not Answered: {questionStatuses.notAnswered}</span>
                                    </li>
                                    <li className="section-status-item" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                                        <span style={{ fontWeight: '600' }}>Total: {questionStatuses.total} questions</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    );
                })}
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
                        <span className="question-meta-final">
                            &nbsp; <span style={{ backgroundColor: "#00FFFF", padding: "5px", borderRadius: "5px" }}>Type:&nbsp;{currentQuestion.questionType === "mcq"
                                ? "MCQ"
                                : currentQuestion.questionType === "multiple_select"
                                    ? "Multiple Select"
                                    : "Short Answer"}
                                &nbsp; | Marks: {currentQuestion.marks}
                            </span>
                        </span>
                    </p>
                    <h2 className="question-text-final">
                        {currentQuestion.questionText}
                    </h2>

                    {/* --- OPTIONS (MCQ / MULTI) --- */}
                    {(currentQuestion.questionType === "mcq" ||
                        currentQuestion.questionType === "multiple_select") && (
                            <div className="options">
                                {currentQuestion.options.map((option, index) => {
                                    const isMultiple = currentQuestion.questionType === "multiple_select";

                                    const selected = isMultiple
                                        ? Array.isArray(
                                            answers.find((a) => a.questionId === currentQuestion._id)
                                                ?.submittedAnswer
                                        )
                                            ? answers
                                                .find((a) => a.questionId === currentQuestion._id)
                                                ?.submittedAnswer.includes(option)
                                            : false
                                        : selectedAnswerValue === option;

                                    const handleSelect = () => {
                                        if (isMultiple) {
                                            const currentAnswer =
                                                answers.find((a) => a.questionId === currentQuestion._id)
                                                    ?.submittedAnswer || [];

                                            const newAnswer = currentAnswer.includes(option)
                                                ? currentAnswer.filter((opt) => opt !== option)
                                                : [...currentAnswer, option];

                                            dispatch({
                                                type: examActionTypes.ANSWER_QUESTION,
                                                payload: { questionId: currentQuestion._id, option: newAnswer },
                                            });
                                        } else {
                                            handleAnswerSelect(option);
                                        }
                                    };

                                    return (
                                        <label
                                            key={index}
                                            className={`option-label ${selected ? "selected" : ""}`}
                                        >
                                            <input
                                                type={isMultiple ? "checkbox" : "radio"}
                                                className="option-input"
                                                name={`q-${currentQuestion._id}`}
                                                value={option}
                                                checked={selected}
                                                onChange={handleSelect}
                                            />
                                            <span className="option-checkmark"></span>
                                            <span className="option-text">{option}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                    {/* --- SHORT ANSWER (fixed) --- */}
                    {currentQuestion.questionType === "short_answer" && (
                        <div className="short-answer-container">
                            <label>Your Answer:</label>
                            <input
                                type="text"
                                value={
                                    answers.find((a) => a.questionId === currentQuestion._id)
                                        ?.submittedAnswer || ""
                                }
                                onChange={(e) =>
                                    dispatch({
                                        type: examActionTypes.ANSWER_QUESTION,
                                        payload: {
                                            questionId: currentQuestion._id,
                                            option: e.target.value,
                                        },
                                    })
                                }
                                placeholder="Type your answer..."
                                className="short-answer-input"
                            />
                        </div>
                    )}

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
                    <button
                        onClick={handleProceedToReview}
                        disabled={!canSubmit}
                        className={`btn-submit ${!canSubmit ? 'btn-disabled' : ''}`}
                    // title={
                    //     canSubmit
                    //         ? "You can now submit your exam."
                    //         : `Submit button will be enabled after ${formatTime(remainingToUnlock)}`
                    // }
                    >
                        {canSubmit
                            ? "Submit Exam"
                            : `Submit Unlocks In ${formatTime(remainingToUnlock)}`}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default ExamInProgressView;
