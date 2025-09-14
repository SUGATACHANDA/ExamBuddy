import React from "react";
import Timer from "./Timer";

const ExamInProgressView = ({
    exam,
    currentQuestionIndex,
    answers,
    handleAnswerSelect,
    submitExam,
    localVideoRef,
    goToNext,
    goToPrev,
}) => {
    const currentQuestion = exam.questions[currentQuestionIndex];
    if (!currentQuestion) {
        return (
            <div className="status-container">
                <h2>Loading Question...</h2>
            </div>
        );
    }

    return (
        <div className="exam-container">
            <header className="exam-header">
                <h2>{exam.title}</h2>
                {exam.examType === "timed" && (
                    <Timer initialMinutes={exam.duration} onTimeUp={submitExam} />
                )}
            </header>

            <main className="question-area">
                <h3>
                    Question {currentQuestionIndex + 1} of {exam.questions.length}
                </h3>
                <p className="question-text">{currentQuestion.questionText}</p>
                <div className="options">
                    {currentQuestion.options.map((option, index) => {
                        const isChecked = answers[currentQuestion._id] === option;
                        return (
                            <label key={index} className={`option-label ${isChecked ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    className="option-input"
                                    name={`question-${currentQuestion._id}`}
                                    value={option}
                                    checked={isChecked}
                                    onChange={() => handleAnswerSelect(currentQuestion._id, option)}
                                />
                                {/* The checkmark span comes FIRST for easier styling */}
                                <span className="option-checkmark"></span>
                                {/* The text is now wrapped in its own span for styling */}
                                <span className="option-text">{option}</span>
                            </label>
                        );
                    })}
                </div>
            </main>

            {/* --- COMPLETELY REDESIGNED & ROBUST FOOTER --- */}
            <div className="exam-footer-new">
                <button
                    className={currentQuestion === 0 ? "btn-disabled" : "btn-primary"}
                    onClick={goToPrev}
                    disabled={currentQuestionIndex === 0}
                >
                    Previous
                </button>

                {currentQuestionIndex < exam.questions.length - 1 ? (
                    <button className="btn btn-primary" onClick={goToNext}>
                        Next
                    </button>
                ) : (
                    <button className="btn btn-submit" onClick={submitExam}>
                        Submit
                    </button>
                )}
            </div>
            {/* ------------------------------------------- */}

            <video
                ref={localVideoRef}
                autoPlay
                muted
                // playsInline
                style={{ width: '150px', height: '100px', position: 'absolute', top: '90px', right: '10px' }}
            />
        </div>
    );
};

export default ExamInProgressView;
