import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import CloseAppsConfirmModal from '../components/CloseAppsConfirmModal';
import ExamInProgressView from '../components/ExamInProgressView';

const ExamScreen = () => {
    // --- HOOKS ---
    const { id: examId, qIndex } = useParams();
    const navigate = useNavigate();

    // The current question index is the SINGLE SOURCE OF TRUTH, derived from the URL.
    const currentQuestionIndex = parseInt(qIndex, 10);

    // --- STATE MANAGEMENT ---
    const [screenState, setScreenState] = useState('MEDIA_CHECK'); // The state machine for setup
    const [exam, setExam] = useState(null);
    const [answers, setAnswers] = useState(() => {
        // Persist answers in sessionStorage to survive page refreshes between questions.
        const saved = sessionStorage.getItem(`exam_answers_${examId}`);
        return saved ? JSON.parse(saved) : {};
    });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [appList, setAppList] = useState([]);
    const [error, setError] = useState('');
    const localVideoRef = useRef(null);


    // --- CORE EVENT HANDLERS (Memoized for stability) ---

    // --- DEFINITIVE FIX #1: RE-INTRODUCE NAVIGATION HANDLERS ---
    const goToNext = useCallback(() => {
        if (exam && currentQuestionIndex < exam.questions.length - 1) {
            navigate(`/exam/${examId}/question/${currentQuestionIndex + 1}`);
        }
    }, [exam, currentQuestionIndex, examId, navigate]);

    const goToPrev = useCallback(() => {
        if (currentQuestionIndex > 0) {
            navigate(`/exam/${examId}/question/${currentQuestionIndex - 1}`);
        }
    }, [currentQuestionIndex, examId, navigate]);
    // -----------------------------------------------------------

    const handleAnswerSelect = useCallback((questionId, option) => {
        setAnswers(prev => {
            const newAnswers = { ...prev, [questionId]: option };
            sessionStorage.setItem(`exam_answers_${examId}`, JSON.stringify(newAnswers));
            return newAnswers;
        });
    }, [examId]);

    const submitExam = useCallback(async () => {
        if (screenState === 'FINISHED' || screenState === 'EXPELLED') return;
        setScreenState('FINISHED');
        const formattedAnswers = Object.entries(answers).map(([qid, ans]) => ({ questionId: qid, submittedAnswer: ans }));
        try {
            // 1. Submit the data.
            await api.post('/results/submit', { examId, answers: formattedAnswers });

            // 2. Tell the main process to disable lockdowns.
            if (window.electronAPI) window.electronAPI.examFinished();

            // 3. Clean up session data.
            sessionStorage.removeItem(`exam_answers_${examId}`);
            sessionStorage.removeItem(`exam_setup_complete_${examId}`);

            // 4. Now, navigate to the success screen. This will now have time to execute.
            navigate('/submission-success');
        } catch (err) {
            setError('Failed to submit exam. Please contact support.');
            console.error(err);
        }
    }, [answers, examId, navigate, screenState]);

    const handleViolation = useCallback(async (violationType) => {
        // Prevent multiple expulsion calls if an event fires rapidly
        if (screenState === 'EXPELLED') return;

        console.warn(`CRITICAL VIOLATION DETECTED: ${violationType}. Expelling student.`);

        // 1. Immediately update the UI to lock the student out.
        setError(`You have been expelled due to a security violation: ${violationType}.`);
        setScreenState('EXPELLED');

        try {
            // 2. Asynchronously notify the backend to permanently record the expulsion.
            console.log("Notifying server of expulsion...");
            await api.post('/results/expel', { examId });
            console.log("Server has acknowledged the expulsion.");
        } catch (err) {
            // This is a "fire and forget" call. The primary goal is locking the UI.
            console.error("Failed to log expulsion to server, but student is already locked out locally.", err);
        } finally {
            // 3. Signal to the main process that the exam is over.
            if (window.electronAPI) {
                // In production, examFinished will now quit the app.
                // We add a slight delay to allow the user to read the message.
                setTimeout(() => window.electronAPI.examFinished(), 4000); // 4-second delay
            }
        }
    }, [examId, screenState]);


    // --- LIFECYCLE EFFECT: The Definitive Setup State Machine ---
    useEffect(() => {
        let mediaStream = null;
        const videoElement = localVideoRef.current; // Capture ref value at start of effect

        const setupFlow = async () => {
            console.log(`Setup Flow: Entering state [${screenState}]`);

            try {
                if (screenState === 'MEDIA_CHECK') {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
                    setScreenState('APP_CHECK');
                    return;
                }
                if (screenState === 'APP_CHECK') {
                    const apps = await window.electronAPI.getAppsToClose();
                    if (apps.length > 0) {
                        const confirmed = await new Promise(resolve => {
                            setAppList(apps);
                            setIsConfirmModalOpen(true);
                            window.resolveAppCloseConfirmation = resolve;
                        });
                        setIsConfirmModalOpen(false);
                        if (confirmed) {
                            window.electronAPI.killAppList(apps);
                            await new Promise(r => setTimeout(r, 2500));
                        } else {
                            throw new Error("Application closure is required to proceed.");
                        }
                    }
                    setScreenState('LOADING_EXAM');
                    return;
                }
                if (screenState === 'LOADING_EXAM') {
                    window.electronAPI.examStarted();
                    window.electronAPI.onViolation(handleViolation);
                    const { data } = await api.get(`/exams/start/${examId}`);
                    setExam(data);
                    sessionStorage.setItem(`exam_setup_complete_${examId}`, 'true');
                    setScreenState('IN_PROGRESS');
                }
            } catch (err) {
                setError(err.message || 'A security check failed.');
                setScreenState('EXPELLED');
            }
        };

        if (sessionStorage.getItem(`exam_setup_complete_${examId}`) === 'true') {
            const reacquireMedia = async () => {
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
                } catch (err) { setError('Could not re-acquire camera/microphone.'); setScreenState('EXPELLED'); }
            };
            reacquireMedia();
            if (screenState !== 'IN_PROGRESS' && screenState !== 'EXPELLED') {
                setScreenState('LOADING_EXAM');
            }
        } else {
            if (['MEDIA_CHECK', 'APP_CHECK', 'LOADING_EXAM'].includes(screenState)) {
                setupFlow();
            }
        }

        return () => { // The cleanup function
            const stream = videoElement?.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [screenState, examId, handleViolation]);

    // --- RENDER LOGIC ---

    if (screenState !== 'IN_PROGRESS') {
        let statusText = 'Requesting Camera & Microphone Access...';
        if (screenState === 'APP_CHECK') statusText = 'Checking for other applications...';
        if (screenState === 'LOADING_EXAM') statusText = 'Finalizing Setup & Loading Exam...';

        return (
            <div className="exam-screen-wrapper">
                <video ref={localVideoRef} autoPlay muted playsInline className="local-video-preview" />
                <CloseAppsConfirmModal
                    isOpen={isConfirmModalOpen}
                    appList={appList}
                    onClose={() => window.resolveAppCloseConfirmation && window.resolveAppCloseConfirmation(false)}
                    onConfirm={() => window.resolveAppCloseConfirmation && window.resolveAppCloseConfirmation(true)}
                />
                {screenState !== 'EXPELLED' && <div className="status-container"><h2>{statusText}</h2></div>}
                {screenState === 'EXPELLED' && <div className="expelled-container"><h1>You have been expelled</h1><p>{error}</p></div>}
            </div>
        );
    }

    if (screenState === 'EXPELLED') {
        return (
            <div className="expelled-container">
                <h1>You Have Been Expelled</h1>
                <p>{error}</p>
                <div className="expelled-actions">
                    <button onClick={() => window.electronAPI.closeApp()} className="btn btn-danger">
                        Close Application
                    </button>
                </div>
            </div>
        );
    }

    if (!exam || isNaN(currentQuestionIndex) || currentQuestionIndex >= exam.questions.length) {
        return <div className="status-container"><h2>Loading question or invalid URL...</h2></div>;
    }

    // Pass all necessary state and handlers down to the dedicated view component.
    return (
        <ExamInProgressView
            exam={exam}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            handleAnswerSelect={handleAnswerSelect}
            submitExam={submitExam}
            localVideoRef={localVideoRef}
            examId={examId}
            navigate={navigate}
            // --- DEFINITIVE FIX #2: PASS THE HANDLERS AS PROPS ---
            goToNext={goToNext}
            goToPrev={goToPrev}
        />
    );
};

export default ExamScreen;