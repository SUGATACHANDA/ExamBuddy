// src/screens/ReviewScreen.js
import { useAuth } from '../context/AuthContext';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

// This is a new, reusable sub-component for the confirmation modal
const SubmitConfirmModal = ({ isOpen, onClose, onConfirm, submitting }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content text-center">
                <h2>Final Submission Confirmation</h2>
                <p>Are you sure you want to submit your exam? You will not be able to change your answers after this point.</p>
                <div className="modal-actions justify-center">
                    <button onClick={onClose} className="btn-secondary" disabled={submitting}>Go Back to Review</button>
                    <button onClick={onConfirm} className="btn-submit" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ReviewScreen = () => {

    const location = useLocation();

    const { submitExamHandler, clearContextSubmitHandler } = useAuth();

    // Get the exam state passed via navigation
    const { exam, answers } = location.state || {};

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [backUrl, setBackUrl] = useState('');

    useEffect(() => {
        // When the component loads, read the last location from sessionStorage.
        const savedLocationRaw = sessionStorage.getItem(`lastExamLocation_${exam._id}`);
        if (savedLocationRaw) {
            const savedLocation = JSON.parse(savedLocationRaw);
            // Construct the correct URL based on the saved indexes.
            const url = `/exam/${exam._id}/section/${savedLocation.secIndex}/question/${savedLocation.qIndex}`;
            console.log("Constructed 'Go Back' URL:", url);
            setBackUrl(url);
        } else {
            // Fallback to the first question if something went wrong (shouldn't happen)
            setBackUrl(`/exam/${exam._id}/section/0/question/0`);
        }
    }, [exam._id]);

    // This useMemo hook calculates all the summary stats needed for the UI
    const examSummary = useMemo(() => {
        if (!exam || !answers) return [];

        return exam.sections.map(section => {
            let answered = 0, notAnswered = 0, markedForReview = 0, answeredAndMarked = 0;
            const sectionQuestionIds = new Set(section.questions.map(q => q._id));

            answers.forEach(ans => {
                if (sectionQuestionIds.has(ans.questionId)) {
                    if (ans.status === 'answered') answered++;
                    else if (ans.status === 'notAnswered') notAnswered++;
                    else if (ans.status === 'markedForReview') markedForReview++;
                    else if (ans.status === 'answeredAndMarked') answeredAndMarked++;
                }
            });

            const totalQuestions = section.questions.length;
            const notVisited = totalQuestions - (answered + notAnswered + markedForReview + answeredAndMarked);

            const sectionResult = {
                title: section.title,
                totalQuestions,
                answered,
                notAnswered: notAnswered + notVisited,
                markedForReview,
                answeredAndMarked,
            };
            return sectionResult;
        });
    }, [exam, answers]);

    const handleFinalSubmit = useCallback(async () => {
        setIsSubmitting(true);
        if (submitExamHandler) {
            await submitExamHandler();
            // --- THIS IS THE FIX ---
            // After the submission is complete, we clean up the context.
            clearContextSubmitHandler();
        } else {
            alert("Submission function not found. Please return to the exam.");
        }
    }, [submitExamHandler, clearContextSubmitHandler]);

    // The back-to-exam URL logic is the same...


    // Fallback if the user navigates here directly without state
    if (!exam || !answers) {
        return (
            <div className="container status-container">
                <h2>No exam data found.</h2>
                <Link to="/student/dashboard" className="btn-primary">Return to Dashboard</Link>
            </div>
        );
    }

    // Construct the link back to the last question

    return (
        <div className="container">
            <SubmitConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleFinalSubmit}
                submitting={isSubmitting}
            />

            <h1>Exam Summary: {exam.title}</h1>
            <p className="subtitle">Please review the status of all sections before your final submission.</p>

            <div className="summary-table-container">
                <table className="summary-table">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Total Questions</th>
                            <th>Answered</th>
                            <th>Not Answered</th>
                            <th>Marked for Review</th>
                            <th>Answered & Marked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {examSummary.map((sectionStats, index) => (
                            <tr key={index}>
                                <td>{sectionStats.title}</td>
                                <td>{sectionStats.totalQuestions}</td>
                                <td className="status-answered">{sectionStats.answered}</td>
                                <td className="status-not-answered">{sectionStats.notAnswered}</td>
                                <td className="status-marked">{sectionStats.markedForReview}</td>
                                <td className="status-answered-marked">{sectionStats.answeredAndMarked}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="review-actions">
                <Link to={backUrl} className="button btn-secondary">Go Back to Exam</Link>
                <button onClick={() => setIsConfirmModalOpen(true)} className="btn-submit">
                    Proceed to Submit
                </button>
            </div>
        </div>
    );
};

export default ReviewScreen;