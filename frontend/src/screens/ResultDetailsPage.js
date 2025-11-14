import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosConfig";
import Pagination from "../components/teacher/Pagination";
import LoadingScreen from "components/LoadingScreen";

const ResultDetailPage = () => {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const questionsPerPage = 1;

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await api.get(`/results/details/${id}`);
                setResult(res.data);
            } catch (err) {
                console.error("Failed to fetch result details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [id]);

    if (loading) return <LoadingScreen />;
    if (!result || !result.answers) {
        return <div className="result-error">Result not found</div>;
    }

    // Pagination setup
    const totalQuestions = result.answers.length;
    const totalPages = Math.ceil(totalQuestions / questionsPerPage);
    const indexOfLastQ = currentPage * questionsPerPage;
    const indexOfFirstQ = indexOfLastQ - questionsPerPage;
    const currentQuestions = result.answers.slice(indexOfFirstQ, indexOfLastQ);

    return (
        <div className="result-detail-container">
            <Link to="/student/my-results" className="back-btn">
                &larr; Back to My Results
            </Link>

            <div className="result-header">
                <h2>Exam Result Details</h2>
            </div>

            <div className="result-info">
                <p><span>Exam:</span> {result.exam?.title}</p>
                <p><span>Subject:</span> {result.exam?.subject}</p>
                <p><span>Score:</span> {result.score} / {result.totalMarks}</p>
            </div>

            {/* ✅ Render Current Page Questions */}
            {currentQuestions.map((q, idx) => {
                const questionNumber = indexOfFirstQ + idx + 1;

                // ✅ UPDATED: Normalize answers safely (supports arrays, strings, undefined)
                // const correctAnswers = Array.isArray(q.correctAnswers)
                //     ? q.correctAnswers
                //     : Array.isArray(q.correctAnswer)
                //         ? q.correctAnswer
                //         : q.correctAnswer
                //             ? [q.correctAnswer]
                //             : [];

                // const selectedOptions = Array.isArray(q.selectedOption)
                //     ? q.selectedOption
                //     : q.selectedOption
                //         ? [q.selectedOption]
                //         : [];

                // ✅ UPDATED: compute awarded marks dynamically (for multi-select fractional marking)
                const earnedMarks =
                    typeof q.awardedMarks === "number"
                        ? parseFloat(q.awardedMarks.toFixed(2))
                        : q.isCorrect
                            ? q.questionMarks
                            : 0;

                return (
                    <div key={idx} className="question-card">
                        {/* ✅ Added question marks and type */}
                        <div className="question-text">
                            <b>Question {questionNumber}</b>&nbsp;
                            ({q.questionType === "mcq"
                                ? "MCQ"
                                : q.questionType === "multiple_select"
                                    ? "Multiple Select"
                                    : "Short Answer" || "N/A"} | {q.questionMarks} marks)
                            <br />
                            {q.questionText}
                        </div>

                        {/* ✅ MCQ / Multiple Select Display */}
                        {(q.questionType === "mcq" || q.questionType === "multiple_select") && (
                            <ul className="options-list">
                                {q.options?.map((opt, i) => {
                                    // ✅ Handle both MCQ (string) and Multiple Select (array)
                                    const correctAnswers = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
                                        ? q.correctAnswers
                                        : q.correctAnswer
                                            ? [q.correctAnswer]
                                            : [];

                                    const isCorrect = correctAnswers.includes(opt);
                                    const isChosen = Array.isArray(q.selectedOption)
                                        ? q.selectedOption.includes(opt)
                                        : q.selectedOption === opt;

                                    let optionClass = "option-item";
                                    let circleClass = "neutral-indicator";
                                    let label = "";

                                    if (isCorrect && isChosen) {
                                        optionClass += " option-correct";
                                        circleClass = "correct-indicator";
                                        label = " (Your Answer & Correct)";
                                    } else if (isCorrect && !isChosen) {
                                        optionClass += " option-correct-notchosen";
                                        circleClass = "correct-notchosen-indicator";
                                        label = " (Correct Answer but Not Chosen)";
                                    } else if (isChosen && !isCorrect) {
                                        optionClass += " option-wrong";
                                        circleClass = "wrong-indicator";
                                        label = " (Your Answer)";
                                    }

                                    return (
                                        <li key={i} className={optionClass}>
                                            <span className={`option-indicator ${circleClass}`} />
                                            {opt}
                                            <span>{label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {/* ✅ Short Answer Display */}
                        {q.questionType === "short_answer" && (
                            <div className="short-answer-block">
                                <p>Your Answer: <b>{q.selectedOption || "Not Answered"}</b></p>
                                <p>Expected Answer: <b>{q.expectedAnswer || "N/A"}</b></p>
                            </div>
                        )}

                        {/* ✅ Marks Display */}
                        <div className="question-marks">
                            <b>Marks Earned:</b> {earnedMarks} / {q.questionMarks}
                        </div>
                    </div>
                );
            })}

            {/* ✅ Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default ResultDetailPage;
