import React, { useState, useEffect } from "react";
import api from "../../api/axiosConfig";
import { useAlert } from "hooks/useAlert";
import AlertModal, { ALERT_TYPES } from "components/ui/AlertModal";

const EditQuestionModal = ({ question, onClose, onSave }) => {
    const [questionText, setQuestionText] = useState("");
    const [questionType, setQuestionType] = useState("mcq");

    // MCQ / Multiple Select
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctAnswer, setCorrectAnswer] = useState("");
    const [correctAnswers, setCorrectAnswers] = useState([]);

    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    // Short Answer
    const [expectedAnswer, setExpectedAnswer] = useState("");

    const [marks, setMarks] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ---------------------------- LOAD EXISTING QUESTION ----------------------------
    useEffect(() => {
        if (question) {
            console.log("Loading question:", question); // Debug log
            setQuestionText(question.questionText);
            setMarks(question.marks || 1);
            setQuestionType(question.questionType);

            if (question.questionType === "mcq") {
                setOptions(question.options || ["", "", "", ""]);
                setCorrectAnswer(question.correctAnswer || "");
            }

            if (question.questionType === "multiple_select") {
                setOptions(question.options || ["", "", "", ""]);
                setCorrectAnswers(question.correctAnswers || []);
            }

            if (question.questionType === "short_answer") {
                setExpectedAnswer(question.expectedAnswer || "");
            }
        }
    }, [question]);

    // ---------------------------- HANDLE OPTION CHANGES ----------------------------
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);

        // Update correctAnswers if the option was previously marked as correct
        if (questionType === "multiple_select") {
            const oldOptionValue = options[index];
            if (correctAnswers.includes(oldOptionValue)) {
                const updatedCorrectAnswers = correctAnswers.map(ans =>
                    ans === oldOptionValue ? value : ans
                );
                setCorrectAnswers(updatedCorrectAnswers);
            }
        }
    };

    const handleCorrectAnswerToggle = (option, index) => {
        let updated = [...correctAnswers];

        // Use both value and index to ensure we're toggling the right option
        const optionToToggle = options[index];

        if (updated.includes(optionToToggle)) {
            updated = updated.filter(ans => ans !== optionToToggle);
        } else {
            updated.push(optionToToggle);
        }
        setCorrectAnswers(updated);
    };

    const addOption = () => {
        setOptions([...options, ""]);
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const removedOption = options[index];
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);

            // Remove from correct answers if it was selected
            if (correctAnswers.includes(removedOption)) {
                setCorrectAnswers(correctAnswers.filter(ans => ans !== removedOption));
            }
        }
    };

    // ---------------------------- VALIDATION ----------------------------
    const validateForm = () => {
        if (!questionText.trim()) {
            setError("Question text is required.");
            return false;
        }

        if (marks < 1) {
            setError("Marks must be at least 1.");
            return false;
        }

        if (questionType === "mcq" || questionType === "multiple_select") {
            // Check for empty options
            const filledOptions = options.filter(opt => opt.trim() !== "");
            if (filledOptions.length < 2) {
                setError("At least two options are required.");
                return false;
            }

            // Check for duplicate options among non-empty ones
            const nonEmptyOptions = options.filter(opt => opt.trim() !== "");
            const uniqueOptions = new Set(nonEmptyOptions.map(opt => opt.trim().toLowerCase()));
            if (uniqueOptions.size !== nonEmptyOptions.length) {
                setError("Options must be unique.");
                return false;
            }

            if (questionType === "mcq") {
                if (!correctAnswer.trim()) {
                    setError("Please select a correct answer.");
                    return false;
                }
                if (!options.includes(correctAnswer)) {
                    setError("Correct answer must be one of the options.");
                    return false;
                }
            }

            if (questionType === "multiple_select") {
                if (correctAnswers.length === 0) {
                    setError("Select at least one correct option.");
                    return false;
                }
            }
        }

        if (questionType === "short_answer") {
            if (!expectedAnswer.trim()) {
                setError("Expected answer is required.");
                return false;
            }
        }

        return true;
    };

    // ---------------------------- SUBMIT UPDATE ----------------------------
    const handleUpdate = async (e) => {
        e.preventDefault();
        setError("");

        if (!validateForm()) {
            return;
        }

        // Filter out empty options for multiple choice questions
        const filteredOptions = (questionType === "mcq" || questionType === "multiple_select")
            ? options.filter(opt => opt.trim() !== "")
            : [];

        const payload = {
            questionText: questionText.trim(),
            questionType,
            marks,
        };

        if (questionType === "mcq") {
            payload.options = filteredOptions;
            payload.correctAnswer = correctAnswer.trim();
            console.log("MCQ Payload:", payload); // Debug log
        }

        if (questionType === "multiple_select") {
            payload.options = filteredOptions;
            payload.correctAnswers = correctAnswers.map(ans => ans.trim());
            console.log("Multiple Select Payload:", payload); // Debug log
        }

        if (questionType === "short_answer") {
            payload.expectedAnswer = expectedAnswer.trim();
            console.log("Short Answer Payload:", payload); // Debug log
        }

        setLoading(true);
        try {
            const response = await api.put(`/questions/${question._id}`, payload);
            console.log("Update response:", response.data); // Debug log
            openAlert({
                type: ALERT_TYPES.SUCCESS,
                title: "Question Updated",
                message: "The question has been updated successfully.",
                confirmText: "OK",
                onConfirm: () => {
                    onSave();
                },
            });
        } catch (err) {
            console.error("Update error:", err);
            openAlert({
                type: ALERT_TYPES.ERROR,
                title: "Update Failed",
                message:
                    err.response?.data?.message ||
                    "Unable to update the question. Please try again.",
                confirmText: "OK",
            });
            setError("Failed to update question. " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------- RENDER UI ----------------------------
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Question</h2>

                {error && <p className="error">{error}</p>}

                <form onSubmit={handleUpdate}>
                    {/* Question Text */}
                    <div className="form-group">
                        <label>Question Text</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            required
                            rows="3"
                        />
                    </div>

                    {/* Question Type */}
                    <div className="form-group">
                        <label>Question Type</label>
                        <select
                            value={questionType}
                            onChange={(e) => setQuestionType(e.target.value)}
                            className="question-type-select"
                        >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="multiple_select">Multiple Select</option>
                            <option value="short_answer">Short Answer</option>
                        </select>
                    </div>

                    {/* ---------------------------------- MCQ ---------------------------------- */}
                    {questionType === "mcq" && (
                        <>
                            <div className="options-section">
                                <label>Options</label>
                                {options.map((opt, i) => (
                                    <div className="option-row" key={i}>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`Option ${i + 1}`}
                                        />
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                className="btn-remove"
                                                onClick={() => removeOption(i)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="btn-add"
                                    onClick={addOption}
                                >
                                    + Add Option
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Correct Answer</label>
                                <select
                                    value={correctAnswer}
                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>
                                        Select correct option
                                    </option>
                                    {options.filter(opt => opt.trim() !== "").map((opt, i) => (
                                        <option key={i} value={opt}>
                                            {opt || `Option ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* -------------------------- MULTIPLE SELECT -------------------------- */}
                    {questionType === "multiple_select" && (
                        <>
                            <div className="options-section">
                                <label>Options (Select all that apply)</label>
                                {options.map((opt, i) => (
                                    <div className="option-row" key={i}>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`Option ${i + 1}`}
                                        />
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={correctAnswers.includes(opt)}
                                                onChange={() => handleCorrectAnswerToggle(opt, i)}
                                            />
                                            Correct
                                        </label>
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                className="btn-remove"
                                                onClick={() => removeOption(i)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="btn-add"
                                    onClick={addOption}
                                >
                                    + Add Option
                                </button>
                            </div>

                            {correctAnswers.length > 0 && (
                                <div className="selected-answers">
                                    <strong>Selected correct answers: </strong>
                                    {correctAnswers.join(", ")}
                                </div>
                            )}
                        </>
                    )}

                    {/* -------------------------- SHORT ANSWER -------------------------- */}
                    {questionType === "short_answer" && (
                        <div className="form-group">
                            <label>Expected Answer</label>
                            <textarea
                                value={expectedAnswer}
                                onChange={(e) => setExpectedAnswer(e.target.value)}
                                required
                                rows="3"
                                placeholder="Enter the expected answer for this question..."
                            />
                        </div>
                    )}

                    {/* Marks */}
                    <div className="form-group">
                        <label>Marks</label>
                        <input
                            type="number"
                            min="1"
                            value={marks}
                            onChange={(e) => setMarks(Number(e.target.value))}
                            required
                        />
                    </div>

                    {/* Buttons */}
                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
            <AlertModal
                {...alertConfig}
                isOpen={alertConfig.isOpen}
                onConfirm={() => {
                    alertConfig.onConfirm?.();
                    closeAlert();
                    onClose(); // close edit modal after alert
                }}
                onCancel={() => {
                    alertConfig.onCancel?.();
                    closeAlert();
                }}
            />
        </div>
    );
};

export default EditQuestionModal;