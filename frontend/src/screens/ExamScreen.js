import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import CloseAppsConfirmModal from '../components/CloseAppsConfirmModal';
import ExamInProgressView from '../components/ExamInProgressView';
import { useAuth } from '../context/AuthContext';
import WarningModal from '../components/WarningModal';

// =========================================================================
// == Reducer + constants
// =========================================================================

const AnswerStatus = {
    NOT_ANSWERED: 'notAnswered',
    ANSWERED: 'answered',
    MARKED_FOR_REVIEW: 'markedForReview',
    ANSWERED_AND_MARKED: 'answeredAndMarked',
};

const examActionTypes = {
    SET_EXAM: 'SET_EXAM',
    ANSWER_QUESTION: 'ANSWER_QUESTION',
    NEXT_QUESTION: 'NEXT_QUESTION',
    PREV_QUESTION: 'PREV_QUESTION',
    GOTO_QUESTION: 'GOTO_QUESTION',
    MARK_FOR_REVIEW: 'MARK_FOR_REVIEW',
    CLEAR_RESPONSE: 'CLEAR_RESPONSE',
};

const initialExamState = {
    exam: null,
    answers: [],
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
};

function stopMediaTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
}

function examReducer(state, action) {
    const { exam, answers, currentSectionIndex, currentQuestionIndex } = state;

    switch (action.type) {
        case examActionTypes.SET_EXAM: {
            const examData = action.payload;
            let initialAnswers = [];
            let questionCounter = 1;

            const sectionsWithMetadata = examData.sections.map(sec => {
                const sectionWithMeta = {
                    ...sec,
                    globalQuestionIndexStart: questionCounter
                };
                questionCounter += sec.questions.length;

                sec.questions.forEach(q => {
                    initialAnswers.push({
                        questionId: q._id,
                        submittedAnswer: null,
                        status: AnswerStatus.NOT_ANSWERED
                    });
                });
                return sectionWithMeta;
            });

            const finalExamData = { ...examData, sections: sectionsWithMetadata };

            return {
                ...state,
                exam: finalExamData,
                answers: initialAnswers,
                currentSectionIndex: 0,
                currentQuestionIndex: 0
            };
        }

        case examActionTypes.ANSWER_QUESTION: {
            return {
                ...state,
                answers: answers.map(ans => {
                    if (ans.questionId === action.payload.questionId) {
                        const isMarked =
                            ans.status === AnswerStatus.MARKED_FOR_REVIEW ||
                            ans.status === AnswerStatus.ANSWERED_AND_MARKED;
                        return {
                            ...ans,
                            submittedAnswer: action.payload.option,
                            status: isMarked ? AnswerStatus.ANSWERED_AND_MARKED : AnswerStatus.ANSWERED
                        };
                    }
                    return ans;
                })
            };
        }

        case examActionTypes.MARK_FOR_REVIEW: {
            return {
                ...state,
                answers: answers.map(ans => {
                    if (ans.questionId === action.payload.questionId) {
                        const isAnswered =
                            ans.status === AnswerStatus.ANSWERED ||
                            ans.status === AnswerStatus.ANSWERED_AND_MARKED;
                        if (action.payload.isMarked) {
                            return {
                                ...ans,
                                status: isAnswered ? AnswerStatus.ANSWERED_AND_MARKED : AnswerStatus.MARKED_FOR_REVIEW
                            };
                        } else {
                            return {
                                ...ans,
                                status: isAnswered ? AnswerStatus.ANSWERED : AnswerStatus.NOT_ANSWERED
                            };
                        }
                    }
                    return ans;
                })
            };
        }

        case examActionTypes.CLEAR_RESPONSE: {
            return {
                ...state,
                answers: answers.map(ans => {
                    if (ans.questionId === action.payload.questionId) {
                        const isMarked =
                            ans.status === AnswerStatus.MARKED_FOR_REVIEW ||
                            ans.status === AnswerStatus.ANSWERED_AND_MARKED;
                        return {
                            ...ans,
                            submittedAnswer: null,
                            status: isMarked ? AnswerStatus.MARKED_FOR_REVIEW : AnswerStatus.NOT_ANSWERED
                        };
                    }
                    return ans;
                })
            };
        }

        case examActionTypes.NEXT_QUESTION: {
            if (!exam) return state;
            const currentSection = exam.sections[currentSectionIndex];
            if (currentQuestionIndex < currentSection.questions.length - 1) {
                return { ...state, currentQuestionIndex: currentQuestionIndex + 1 };
            } else if (currentSectionIndex < exam.sections.length - 1) {
                return { ...state, currentSectionIndex: currentSectionIndex + 1, currentQuestionIndex: 0 };
            }
            return state;
        }

        case examActionTypes.PREV_QUESTION: {
            if (!exam) return state;
            if (currentQuestionIndex > 0) {
                return { ...state, currentQuestionIndex: currentQuestionIndex - 1 };
            } else if (currentSectionIndex > 0) {
                const prevSection = exam.sections[currentSectionIndex - 1];
                return {
                    ...state,
                    currentSectionIndex: currentSectionIndex - 1,
                    currentQuestionIndex: prevSection.questions.length - 1
                };
            }
            return state;
        }

        case examActionTypes.GOTO_QUESTION:
            return {
                ...state,
                currentSectionIndex: action.payload.sectionIndex,
                currentQuestionIndex: action.payload.questionIndex,
            };

        case "LOAD_SAVED_ANSWERS": {
            return {
                ...state,
                answers: action.payload
            };
        }

        default:
            return state;
    }
}

// =========================================================================
// == Main Component
// =========================================================================
const ExamScreen = () => {
    const { id: examId } = useParams();
    const navigate = useNavigate();
    const { userInfo, storeSubmitHandler } = useAuth();
    const [warning, setWarning] = useState(null);

    const cleanupKeyboardListenerRef = useRef(null);

    const studentId =
        userInfo?.collegeId || userInfo?.studentId || userInfo?.id || userInfo?._id || 'STUDENT';

    const [examState, dispatch] = useReducer(examReducer, initialExamState);
    const { exam, answers, currentSectionIndex, currentQuestionIndex } = examState;

    const [screenState, setScreenState] = useState('SETUP');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [appList, setAppList] = useState([]);
    const [error, setError] = useState('');
    const localVideoRef = useRef(null);

    // ✅ Clear stale sessionStorage of other students
    useEffect(() => {
        if (!studentId) return;
        Object.keys(sessionStorage).forEach((key) => {
            if (
                (key.startsWith("examAnswers_") || key.startsWith("lastExamLocation_")) &&
                !key.endsWith(`_${studentId}`)
            ) {
                sessionStorage.removeItem(key);
            }
        });
    }, [studentId]);

    const handleViolation = useCallback(async (violationType) => {
        if (screenState === 'EXPELLED') return;
        setError(`Expelled due to a security violation: ${violationType}.`);
        setScreenState('EXPELLED');
        try {
            await api.post('/results/expel', { examId });
            sessionStorage.removeItem(`examEndTime_${examId}`);
        } catch (err) {
            console.error("Failed to log expulsion to server.");
        } finally {
            if (window.electronAPI) setTimeout(() => window.electronAPI.examFinished(), 4000);
        }
    }, [examId, screenState]);

    const submitExam = useCallback(async () => {
        if (screenState === 'FINISHED' || screenState === 'EXPELLED') return;
        setScreenState('FINISHED');
        const answersForEvaluation = answers.filter(
            ans => ans.status === AnswerStatus.ANSWERED || ans.status === AnswerStatus.ANSWERED_AND_MARKED
        );
        try {
            await api.post('/results/submit', { examId, answers: answersForEvaluation });
            if (window.electronAPI) window.electronAPI.examFinished();

            // ✅ clear setup + cached answers for this student
            sessionStorage.removeItem(`exam_setup_complete_${examId}`);
            sessionStorage.removeItem(`examAnswers_${examId}_${studentId}`);
            sessionStorage.removeItem(`lastExamLocation_${examId}_${studentId}`);
            sessionStorage.removeItem(`examEndTime_${examId}`);
            navigate('/submission-success');
        } catch (err) {
            setError('Failed to submit exam. Please contact support.');
            console.error(err);
        }
    }, [answers, examId, navigate, screenState, studentId]);

    useEffect(() => {
        if (submitExam) {
            storeSubmitHandler(submitExam);
        }
    }, [submitExam, storeSubmitHandler]);

    if (localVideoRef.current && localVideoRef.current.srcObject) {
        stopMediaTracks(localVideoRef.current.srcObject);
        localVideoRef.current.srcObject = null;
    }

    useEffect(() => {
        const runSetupFlow = async () => {
            if (sessionStorage.getItem(`exam_setup_complete_${examId}`) === 'true') {
                setScreenState('LOADING_EXAM');
                return;
            }
            try {
                // ✅ Stop any previous stream before requesting a new one
                if (localVideoRef.current && localVideoRef.current.srcObject) {
                    stopMediaTracks(localVideoRef.current.srcObject);
                    localVideoRef.current.srcObject = null;
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                const appsToClose = await window.electronAPI.getAppsToClose();
                if (appsToClose.length > 0) {
                    const confirmed = await new Promise(resolve => {
                        setAppList(appsToClose);
                        setIsConfirmModalOpen(true);
                        window.resolveAppCloseConfirmation = resolve;
                    });
                    setIsConfirmModalOpen(false);
                    if (confirmed) {
                        window.electronAPI.killAppList(appsToClose);
                        await new Promise(r => setTimeout(r, 2500));
                    } else { throw new Error("Application closure is required to proceed."); }
                }
                sessionStorage.setItem(`exam_setup_complete_${examId}`, 'true');
                setScreenState('LOADING_EXAM');
            } catch (err) {
                setError(err.message || 'A required permission was denied.');
                setScreenState('EXPELLED');
            }
        };

        if (screenState === 'SETUP') {
            runSetupFlow();
        }
    }, [screenState, examId]);

    // ✅ cleanup on unmount (already good in your code)
    useEffect(() => {
        const videoElem = localVideoRef.current;
        return () => {
            // Copy the ref value to a variable to avoid stale closure issues
            const cleanupVideoElem = videoElem;
            if (cleanupVideoElem && cleanupVideoElem.srcObject) {
                stopMediaTracks(cleanupVideoElem.srcObject);
                cleanupVideoElem.srcObject = null;
            }
        };
    }, []);

    useEffect(() => {
        if (screenState === 'LOADING_EXAM') {
            const initializeExam = async () => {
                try {
                    window.electronAPI.examStarted();
                    window.electronAPI.onViolation(handleViolation);
                    if (window.electronAPI.disableKeyboardShortcuts) {
                        cleanupKeyboardListenerRef.current = window.electronAPI.disableKeyboardShortcuts();
                    }
                    window.electronAPI.onShowWarningDialog((data) => {
                        console.log("ExamScreen: Received warning data from main process", data);
                        setWarning(data); // Set state to show the warning modal
                    });
                    const { data } = await api.get(`/exams/${examId}`);

                    // ✅ load cached answers for this student only
                    const savedAnswersRaw = sessionStorage.getItem(`examAnswers_${examId}_${studentId}`);
                    let finalAnswers = null;
                    if (savedAnswersRaw) {
                        try {
                            finalAnswers = JSON.parse(savedAnswersRaw);
                        } catch {
                            finalAnswers = null;
                        }
                    }

                    dispatch({ type: examActionTypes.SET_EXAM, payload: data });
                    if (finalAnswers) {
                        dispatch({ type: "LOAD_SAVED_ANSWERS", payload: finalAnswers });
                    }
                    setScreenState('IN_PROGRESS');
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to load the exam.');
                    setScreenState('EXPELLED');
                }
            };
            initializeExam();
            return () => {
                // When the ExamScreen component unmounts (e.g., after submission),
                // we call the cleanup function we stored in the ref to remove the listener.
                if (cleanupKeyboardListenerRef.current) {
                    cleanupKeyboardListenerRef.current();
                }
            };
        }
    }, [screenState, examId, studentId, handleViolation]);

    useEffect(() => {
        const videoElem = localVideoRef.current;
        return () => {
            // Copy the ref value to a variable to avoid stale closure issues
            const cleanupVideoElem = videoElem;
            if (cleanupVideoElem && cleanupVideoElem.srcObject) {
                stopMediaTracks(cleanupVideoElem.srcObject);
                cleanupVideoElem.srcObject = null;
            }
        };
    }, []);

    useEffect(() => {
        // This effect will run ONLY when `screenState` changes.

        // When the exam is active...
        if (screenState === 'IN_PROGRESS' && window.electronAPI?.toggleKeyboardLock) {
            console.log("ExamScreen: Exam is in progress. Activating keyboard lock.");
            // Turn the lock ON.
            window.electronAPI.toggleKeyboardLock(true);
        }

        // This is the CRUCIAL cleanup function. It runs when the component
        // unmounts OR before the effect runs again for a different `screenState`.
        return () => {
            // If the screen state is no longer in progress (e.g., submitted, expelled),
            // we will disable the lock.
            console.log("ExamScreen: Exam is no longer in progress. Deactivating keyboard lock.");
            if (window.electronAPI?.toggleKeyboardLock) {
                window.electronAPI.toggleKeyboardLock(false);
            }
        };
    }, [screenState]);

    // --- RENDER LOGIC ---
    if (screenState !== 'IN_PROGRESS') {
        let statusText = 'Preparing Security Checks...';
        if (screenState === 'LOADING_EXAM') statusText = 'Loading Exam Please Wait...';
        return (
            <div className="exam-screen-wrapper">

                <CloseAppsConfirmModal
                    isOpen={isConfirmModalOpen}
                    appList={appList}
                    onClose={() => window.resolveAppCloseConfirmation(false)}
                    onConfirm={() => window.resolveAppCloseConfirmation(true)}
                />
                {screenState !== 'EXPELLED' && (
                    <div className="status-container"><h2>{statusText}</h2></div>
                )}
                {screenState === 'EXPELLED' && (
                    <div className="expelled-container">
                        <h1>You have been expelled</h1>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        );
    }

    if (!exam) {
        return <div className="status-container"><h2>Loading...</h2></div>;
    }

    return (
        <ExamInProgressView
            exam={exam}
            answers={answers}
            currentSectionIndex={currentSectionIndex}
            currentQuestionIndex={currentQuestionIndex}
            dispatch={dispatch}
            submitExam={submitExam}
            localVideoRef={localVideoRef}
            examActionTypes={examActionTypes}
        />
    );
};

export default ExamScreen;
