/* eslint-disable no-unused-vars */
// src/pages/ExamScreen.js
import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import CloseAppsConfirmModal from '../components/CloseAppsConfirmModal';
import ExamInProgressView from '../components/ExamInProgressView';
import { useAuth } from '../context/AuthContext';
import { useFaceTracking } from '../hooks/useFaceTracking';
import FaceWarningModal from 'components/FaceWarningModal';


import CapturePhotoModal from "../components/CapturePhotoModal";


// =========================================================================
// == Reducer + constants (kept complete and matching original logic)
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
    // additional internal action used elsewhere
    LOAD_SAVED_ANSWERS: 'LOAD_SAVED_ANSWERS',
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
    const mediaStreamRef = useRef(null); // persistent stream ref
    const audioStreamRef = useRef(null);
    const [showInstructionDialog, setShowInstructionDialog] = useState(false);
    const [agreeChecked, setAgreeChecked] = useState(false);
    const [faceWarning, setFaceWarning] = useState(false);
    const [multiFaceWarning, setMultiFaceWarning] = useState(false);
    const [enableCameraProctoring, setEnableCameraProctoring] = useState(false);
    const [enableAudioProctoring, setEnableAudioProctoring] = useState(false);
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [hasVerifiedFace, setHasVerifiedFace] = useState(false);



    // keep sessionStorage tidy
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

    // ===============================
    // Start/stable camera handling
    // ===============================
    const startCamera = useCallback(async () => {
        try {
            const constraints = {
                video: { width: 320, height: 240, facingMode: "user" },
                audio: false,
            };

            // Stop any existing stream before restarting
            if (mediaStreamRef.current) {
                stopMediaTracks(mediaStreamRef.current);
                mediaStreamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;

            // 🔁 Continuously wait until <video> is actually mounted
            const waitForVideo = () =>
                new Promise((resolve) => {
                    const check = () => {
                        if (localVideoRef.current) resolve();
                        else requestAnimationFrame(check);
                    };
                    check();
                });
            await waitForVideo();

            const video = localVideoRef.current;
            video.srcObject = stream;

            // ✅ Ensure video autoplay actually starts
            const playVideo = async () => {
                try {
                    await video.play();
                    console.log("[ExamScreen] ✅ Camera playing successfully");
                } catch (err) {
                    console.warn("[ExamScreen] ⚠️ Autoplay prevented, retrying...");
                    setTimeout(() => video.play().catch(() => { }), 500);
                }
            };

            if (video.readyState >= 2) {
                await playVideo();
            } else {
                video.onloadedmetadata = playVideo;
            }

            return stream;
        } catch (err) {
            console.error("[ExamScreen] ❌ startCamera error:", err);
            throw err;
        }
    }, []);

    // --- Audio Proctoring (optional sound monitoring) ---
    const startAudioMonitoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            console.log('[ExamScreen] Audio stream active for proctoring.');
        } catch (err) {
            console.error('[ExamScreen] Error starting audio proctoring:', err);
        }
    };


    // Periodic watcher to restart camera if the stream becomes inactive
    useEffect(() => {
        if (!enableCameraProctoring) return;
        if (screenState === 'FINISHED' || screenState === 'EXPELLED') return;

        const id = setInterval(async () => {
            try {
                // Don't restart if exam ended
                if (screenState === 'FINISHED' || screenState === 'EXPELLED') return;

                if ((!mediaStreamRef.current || !mediaStreamRef.current.active) && enableCameraProctoring) {
                    console.warn("[ExamScreen] camera stream inactive - attempting restart...");
                    await startCamera();
                }
            } catch (err) {
                console.error("[ExamScreen] Failed to auto-restart camera:", err);
            }
        }, 5000);
        return () => clearInterval(id);
    }, [enableCameraProctoring, startCamera, screenState]);



    // ===============================
    // Face tracking hook
    // ===============================
    const isFaceVisible = useFaceTracking(localVideoRef, async (violationType) => {
        console.warn("Face tracking violation:", violationType);
        await handleViolation(violationType);
    },
        () => setFaceWarning(true),
        () => setMultiFaceWarning(true)
    );

    const isMultipleFaceVisible = useFaceTracking(localVideoRef, async (violationType) => {
        console.warn("Face tracking violation:", violationType);
        await handleViolation(violationType);
    },
        () => setMultiFaceWarning(true)
    );
    // ===============================
    // handleViolation & submitExam
    // ===============================
    const handleViolation = useCallback(async (violationType) => {
        if (screenState === 'EXPELLED') return;

        console.warn(`[ExamScreen] 🚨 Security violation detected: ${violationType}`);
        setError(`Expelled due to a security violation: ${violationType}.`);
        setScreenState('EXPELLED');

        // try to log expulsion, but continue to force-stop media even if logging fails
        try {
            await api.post('/results/expel', { examId });
            sessionStorage.removeItem(`examEndTime_`);
            sessionStorage.removeItem(`exam_setup_complete_${examId}`);
            sessionStorage.removeItem(`examAnswers_${examId}_${studentId}`);
            sessionStorage.removeItem(`lastExamLocation_${examId}_${studentId}`);
            sessionStorage.removeItem(`examInstructionsShown_${examId}`);
            sessionStorage.removeItem(`hasFaceVerified_${examId}_${studentId}`);
            sessionStorage.removeItem('examFaceVerificationDone')
        } catch (err) {
            console.error("[ExamScreen] Failed to log expulsion:", err);
        }

        // ---- Bruteforce media teardown (no reload) ----
        try {
            console.log("[ExamScreen] 🧹 Bruteforce stopping ALL media (no reload) ...");

            // 1) Stop known ref streams (React refs)
            try {
                if (mediaStreamRef?.current) {
                    try {
                        mediaStreamRef.current.getTracks().forEach(t => {
                            try { t.stop(); console.log("[ExamScreen] stopped mediaStreamRef track:", t.kind); } catch (e) { }
                        });
                    } catch (e) { }
                    mediaStreamRef.current = null;
                }
            } catch (e) { /* ignore */ }

            try {
                if (audioStreamRef?.current) {
                    try {
                        audioStreamRef.current.getTracks().forEach(t => {
                            try { t.stop(); console.log("[ExamScreen] stopped audioStreamRef track:", t.kind); } catch (e) { }
                        });
                    } catch (e) { }
                    audioStreamRef.current = null;
                }
            } catch (e) { /* ignore */ }

            // 2) Stop tracks on the video element(s) and clear srcObject
            // try {
            //     const videos = Array.from(document.querySelectorAll('video'));
            //     for (const v of videos) {
            //         try {
            //             // Pause & stop srcObject tracks
            //             v.pause && v.pause();
            //             const s = v.srcObject;
            //             if (s && s.getTracks) {
            //                 s.getTracks().forEach(t => {
            //                     try { t.stop(); console.log("[ExamScreen] stopped video element track:", t.kind); } catch (e) { }
            //                 });
            //             }
            //             // Also clear src and srcObject and reload the element
            //             try { v.srcObject = null; } catch (e) { }
            //             try { v.removeAttribute('src'); v.load && v.load(); } catch (e) { }
            //         } catch (e) { console.warn("[ExamScreen] error cleaning video element:", e); }
            //     }
            // } catch (e) { /* ignore */ }

            // // 3) Stop any global stream variables (common names)
            // try {
            //     const globalNames = ['localStream', 'stream', 'videoStream', 'audioStream'];
            //     for (const name of globalNames) {
            //         try {
            //             const s = window[name];
            //             if (s && s.getTracks) {
            //                 s.getTracks().forEach(t => {
            //                     try { t.stop(); console.log("[ExamScreen] stopped global stream", name, t.kind); } catch (e) { }
            //                 });
            //                 window[name] = null;
            //             }
            //         } catch (e) { }
            //     }
            // } catch (e) { /* ignore */ }

            // // 4) Stop any MediaRecorder instances attached to page (if you store them globally)
            // try {
            //     if (Array.isArray(window.mediaRecorders)) {
            //         window.mediaRecorders.forEach(rec => {
            //             try { if (rec && rec.state !== 'inactive') rec.stop(); console.log("[ExamScreen] stopped mediaRecorder"); } catch (e) { }
            //         });
            //         window.mediaRecorders = [];
            //     }
            // } catch (e) { }

            // // 5) Close any RTCPeerConnections you might have exposed globally
            // try {
            //     if (Array.isArray(window.peerConnections)) {
            //         window.peerConnections.forEach(pc => {
            //             try { pc.getSenders && pc.getSenders().forEach(s => { try { s.track && s.track.stop(); } catch (e) { } }); pc.close && pc.close(); console.log("[ExamScreen] closed peerConnection"); } catch (e) { }
            //         });
            //         window.peerConnections = [];
            //     }
            // } catch (e) { }

            // // 6) Close any AudioContexts (stop and close)
            // try {
            //     // common patterns: window.audioContext or array window.audioContexts
            //     if (window.audioContext && typeof window.audioContext.close === 'function') {
            //         try { window.audioContext.close(); console.log("[ExamScreen] closed audioContext"); } catch (e) { }
            //         window.audioContext = null;
            //     }
            //     if (Array.isArray(window.audioContexts)) {
            //         window.audioContexts.forEach(ac => { try { ac.close && ac.close(); } catch (e) { } });
            //         window.audioContexts = [];
            //     }
            // } catch (e) { }

            // 7) As extra safety: enumerate devices and try to stop any active tracks from element refs
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    // We *do not* call getUserMedia here (that would prompt) — we only list devices.
                    const devs = await navigator.mediaDevices.enumerateDevices();
                    console.log("[ExamScreen] available devices:", devs.map(d => `${d.kind}:${d.label || d.deviceId}`));
                }
            } catch (e) { /* ignore */ }

            console.log("[ExamScreen] ✅ All brute-force teardown attempts done.");
        } catch (err) {
            console.error("[ExamScreen] ⚠️ Bruteforce media stop error:", err);
        }

        // Notify electron native layer if present (close native webcam handles)
        try {
            if (window.electronAPI?.examFinished) {
                try { window.electronAPI.examFinished(); } catch (e) { console.warn("electronAPI examFinished failed", e); }
            }
            if (window.electronAPI?.stopLiveDisplayMonitor) {
                window.electronAPI.stopLiveDisplayMonitor();
            }
        } catch (e) { }

    }, [examId, screenState, studentId]);

    const submitExam = useCallback(async () => {
        if (screenState === "FINISHED" || screenState === "EXPELLED") return;

        console.log("[ExamScreen] Submitting exam - stopping all media...");

        try {
            // ✅ STEP 1: Immediately stop any media linked to the <video> element
            if (localVideoRef.current) {
                const stream = localVideoRef.current.srcObject;
                if (stream) {
                    stream.getTracks().forEach(track => {
                        if (track.readyState === "live") {
                            track.stop();
                            console.log(`[submitExam] Stopped ${track.kind} track from videoRef`);
                        }
                    });
                }
                localVideoRef.current.pause();
                localVideoRef.current.srcObject = null;
                console.log("[submitExam] Cleared local video source");
            }

            // ✅ STEP 2: Stop the persistent camera stream
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => {
                    if (track.readyState === "live") {
                        track.stop();
                        console.log(`[submitExam] Stopped ${track.kind} track from mediaStreamRef`);
                    }
                });
                mediaStreamRef.current = null;
            }

            // ✅ STEP 3: Stop any audio stream
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => {
                    if (track.readyState === "live") {
                        track.stop();
                        console.log(`[submitExam] Stopped ${track.kind} track from audioStreamRef`);
                    }
                });
                audioStreamRef.current = null;
            }

            // ✅ STEP 4: Wait a bit to ensure browser releases camera
            await new Promise(res => setTimeout(res, 1500));

            // ✅ STEP 5: Update state AFTER cleanup
            setScreenState("FINISHED");

            // ✅ STEP 6: Submit answers
            const answersForEvaluation = answers.filter(
                ans =>
                    ans.status === AnswerStatus.ANSWERED ||
                    ans.status === AnswerStatus.ANSWERED_AND_MARKED
            );

            console.log("[submitExam] Submitting answers to backend...");
            await api.post("/results/submit", { examId, answers: answersForEvaluation });
            console.log("[submitExam] Answers successfully submitted.");

            // ✅ STEP 7: Tell Electron to close webcam if running in Electron
            if (window.electronAPI?.examFinished) {
                window.electronAPI.examFinished();
            }

            // ✅ STEP 8: Clean up all related session storage
            [
                `exam_setup_complete_${examId}`,
                `examAnswers_${examId}_${studentId}`,
                `lastExamLocation_${examId}_${studentId}`,
                `examEndTime_`,
                `examInstructionsShown_${examId}`,
                `hasFaceVerified_${examId}_${studentId}`,
                'examFaceVerificationDone',
                localStorage.removeItem(`exam_time_${exam._id}_${userInfo?.id}`),
                localStorage.removeItem(`exam_start_${exam._id}_${userInfo?.id}`),
            ].forEach(key => sessionStorage.removeItem(key));

            console.log("[submitExam] ✅ All media stopped & session cleared.");

            // ✅ STEP 9: Navigate to success page after full release
            await new Promise(res => setTimeout(res, 1000));
            navigate("/submission-success");
            window.location.reload()
        } catch (err) {
            console.error("[submitExam] ❌ Error during submission:", err);
            setError("Failed to submit exam. Please contact support.");
        }
    }, [answers, examId, navigate, screenState, studentId]);


    useEffect(() => {
        if (submitExam) {
            storeSubmitHandler(submitExam);
        }
    }, [submitExam, storeSubmitHandler]);


    // =======================================================
    // == SETUP FLOW (start camera and perform app checks)
    // =======================================================
    useEffect(() => {
        const runSetupFlow = async () => {
            if (sessionStorage.getItem(`exam_setup_complete_${examId}`) === 'true') {
                setScreenState('LOADING_EXAM');
                return;
            }
            try {
                // Check apps to close via electron API (if present)
                if (window.electronAPI && window.electronAPI.getAppsToClose) {
                    const appsToClose = await window.electronAPI.getAppsToClose();
                    if (appsToClose.length > 0) {
                        const confirmed = await new Promise(resolve => {
                            setAppList(appsToClose);
                            setIsConfirmModalOpen(true);
                            // The modal should call window.resolveAppCloseConfirmation to resolve
                            window.resolveAppCloseConfirmation = resolve;
                        });
                        setIsConfirmModalOpen(false);
                        if (confirmed) {
                            window.electronAPI.killAppList(appsToClose);
                            // give system a moment to close them
                            await new Promise(r => setTimeout(r, 2500));
                        } else {
                            throw new Error("Application closure is required to proceed.");
                        }
                    }
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
    }, [screenState, examId, startCamera]);

    // =======================================================
    // == LOADING EXAM -> IN_PROGRESS
    // =======================================================
    useEffect(() => {
        if (screenState === 'LOADING_EXAM') {
            const initializeExam = async () => {
                try {
                    if (window.electronAPI && window.electronAPI.examStarted) {
                        window.electronAPI.examStarted();
                    }
                    if (window.electronAPI?.startLiveDisplayMonitor) {
                        window.electronAPI.startLiveDisplayMonitor({
                            examId,
                            studentId
                        }).then(() => {
                            console.log("Live display monitor started!");
                        });
                    }
                    window.electronAPI.onDisplayViolation((data) => {
                        console.warn("DISPLAY VIOLATION:", data);
                        setError("Multiple displays or screen mirroring detected.");
                        handleViolation("DISPLAY_VIOLATION");
                    });
                    if (window.electronAPI && window.electronAPI.onViolation) {
                        window.electronAPI.onViolation(handleViolation);
                    }
                    if (window.electronAPI && window.electronAPI.disableKeyboardShortcuts) {
                        cleanupKeyboardListenerRef.current = window.electronAPI.disableKeyboardShortcuts();
                    }
                    if (window.electronAPI && window.electronAPI.onShowWarningDialog) {
                        window.electronAPI.onShowWarningDialog((data) => {
                            console.log("ExamScreen: Received warning data from main process", data);
                            setWarning(data);
                        });
                    }

                    const { data } = await api.get(`/exams/${examId}`);
                    setEnableCameraProctoring(Boolean(data.enableCameraProctoring));
                    setEnableAudioProctoring(Boolean(data.enableAudioProctoring));

                    console.log('[ExamScreen] Proctoring settings:', {
                        camera: Boolean(data.enableCameraProctoring),
                        audio: Boolean(data.enableAudioProctoring),
                    });

                    // ✅ load cached answers for this student only (if present)
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
                    if (data.enableCameraProctoring) {
                        console.log('[ExamScreen] Camera proctoring enabled → starting webcam.');
                        setTimeout(() => startCamera(), 300); // Delay ensures <video> ref is mounted
                    }

                    if (data.enableAudioProctoring) {
                        console.log('[ExamScreen] Audio proctoring enabled → starting mic monitoring.');
                        await startAudioMonitoring();
                    }
                    const examInstructionKey = `examInstructionsShown_${examId}`;
                    const hasSeenInstructions = sessionStorage.getItem(examInstructionKey);

                    if (!hasSeenInstructions) {
                        setShowInstructionDialog(true); // show instructions if not seen
                    } else {
                        setScreenState("IN_PROGRESS"); // start directly if already seen
                    }
                    if (finalAnswers) {
                        dispatch({ type: "LOAD_SAVED_ANSWERS", payload: finalAnswers });
                    }
                    // ensure we are in IN_PROGRESS (if not already set by the instructions flow)
                    setScreenState('IN_PROGRESS');
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to load the exam.');
                    setScreenState('EXPELLED');
                }
            };
            initializeExam();

            return () => {
                if (cleanupKeyboardListenerRef.current) {
                    try {
                        cleanupKeyboardListenerRef.current();
                    } catch (e) {
                        // ignore
                    }
                }
            };
        }
    }, [screenState, examId, studentId, handleViolation, startCamera]);

    // Another cleanup effect for video when the component unmounts

    useEffect(() => {
        if (screenState === "IN_PROGRESS" && enableCameraProctoring) {
            const startExamCamera = async () => {
                try {
                    console.log("[ExamScreen] Starting camera for exam screen...");
                    await startCamera();
                } catch (err) {
                    console.error("[ExamScreen] Could not start camera on exam load:", err);
                }
            };
            startExamCamera();
        }
    }, [screenState, enableCameraProctoring, startCamera]);

    // Keyboard lock toggle while in progress (keeps previous behavior)
    useEffect(() => {
        if (screenState === 'IN_PROGRESS' && window.electronAPI?.toggleKeyboardLock) {
            console.log("ExamScreen: Exam is in progress. Activating keyboard lock.");
            window.electronAPI.toggleKeyboardLock(true);
        }

        return () => {
            console.log("ExamScreen: Deactivating keyboard lock if set.");
            if (window.electronAPI?.toggleKeyboardLock) {
                window.electronAPI.toggleKeyboardLock(false);
            }
        };
    }, [screenState]);


    // Keyboard lock toggle while in progress (keeps previous behavior)
    useEffect(() => {
        if (screenState === 'IN_PROGRESS' && window.electronAPI?.toggleKeyboardLock) {
            console.log("ExamScreen: Exam is in progress. Activating keyboard lock.");
            window.electronAPI.toggleKeyboardLock(true);
        }

        return () => {
            console.log("ExamScreen: Deactivating keyboard lock if set.");
            if (window.electronAPI?.toggleKeyboardLock) {
                window.electronAPI.toggleKeyboardLock(false);
            }
        };
    }, [screenState]);

    // Instruction dialog UI
    if (showInstructionDialog) {
        return (
            <div className="instruction-overlay">
                <div className="instruction-dialog">
                    <h2>Exam Instructions</h2>
                    <ul className="instruction-list">
                        <li>✅ Keep your camera & mic ON during the exam.</li>
                        <li>🚫 Do not minimize, switch windows, or open other apps.</li>
                        <li>🕒 Timer runs continuously once the exam begins.</li>
                        <li>⚠️ Any suspicious activity may lead to expulsion.</li>
                    </ul>
                    <div className="checkbox-row">
                        <input
                            type="checkbox"
                            id="agreeCheck"
                            checked={agreeChecked}
                            onChange={(e) => setAgreeChecked(e.target.checked)}
                        />
                        <label htmlFor="agreeCheck">I understand and agree with the above instructions.</label>
                    </div>
                    <button
                        className="proceed-btn"
                        disabled={!agreeChecked}
                        onClick={() => {
                            sessionStorage.setItem(`examInstructionsShown_${examId}`, "true");
                            setShowInstructionDialog(false);
                            // Directly perform verification flow without calling hooks inside a callback
                            if (exam?.enableFaceVerification && !hasVerifiedFace) {
                                setScreenState("VERIFYING");
                                setShowCaptureModal(true);
                            } else {
                                // Skip verification if not required
                                setScreenState("IN_PROGRESS");
                            }
                        }}
                    >
                        {exam?.enableFaceVerification ? 'Proceed to Face Verification' : 'Start Exam'}
                    </button>
                </div>
            </div>
        );
    }

    const examFaceVerificationKey = "examFaceVerificationDone"
    const hasFaceVerificationDone = sessionStorage.getItem(examFaceVerificationKey);

    if (!hasFaceVerificationDone) {
        if (showCaptureModal) {
            return (
                <CapturePhotoModal
                    isOpen={showCaptureModal}
                    collegeId={userInfo?.collegeId}
                    onSuccess={(confidence) => {
                        console.log(`[ExamScreen] Verified at ${confidence}% confidence`);
                        sessionStorage.setItem(`examFaceVerificationDone`, "true");
                        setShowCaptureModal(false);
                        setHasVerifiedFace(true);
                        setScreenState("IN_PROGRESS");
                        setTimeout(() => setScreenState("IN_PROGRESS"), 5000);
                    }}
                    onFail={(msg) => {
                        console.warn(`[ExamScreen] Verification failed: ${msg}`);
                        setShowCaptureModal(false);
                        handleViolation("Face verification failed");
                    }}
                />
            );
        }
    }




    // --- RENDER LOGIC WHEN NOT IN_PROGRESS ---
    if (screenState !== 'IN_PROGRESS') {
        let statusText = 'Preparing Security Checks...';
        if (screenState === 'LOADING_EXAM') statusText = 'Loading Exam Please Wait...';
        return (
            <div className="exam-screen-wrapper">
                <CloseAppsConfirmModal
                    isOpen={isConfirmModalOpen}
                    appList={appList}
                    onClose={() => window.resolveAppCloseConfirmation && window.resolveAppCloseConfirmation(false)}
                    onConfirm={() => window.resolveAppCloseConfirmation && window.resolveAppCloseConfirmation(true)}
                />
                {screenState !== 'EXPELLED' && (
                    <div className="status-container"><h2>{statusText}</h2></div>
                )}
                {screenState === 'EXPELLED' && (
                    <div className="expelled-container">
                        <h1>You have been expelled</h1>
                        <p>{error}</p>
                        <button
                            onClick={() => {
                                navigate('/student/dashboard');
                                window.location.reload();
                            }}
                            className="btn btn-primary"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (!exam) {
        return <div className="status-container"><h2>Loading...</h2></div>;
    }

    return (
        <div className="exam-container-with-tracking">

            {faceWarning && <FaceWarningModal
                isOpen={faceWarning}
                onClose={() => setFaceWarning(false)}
                message="Face not detected — Please return to camera view or else You will be EXPELLED in 10 seconds."
                autoClose={true}
                isFaceVisible={isFaceVisible}
            />}


            {multiFaceWarning && <FaceWarningModal
                isOpen={multiFaceWarning}
                onClose={() => setMultiFaceWarning(false)}
                message="🚫 Multiple faces detected! Please ensure only you are visible."
                autoClose={true}
                isFaceVisible={isMultipleFaceVisible}
            />}

            {/* --- Main exam UI --- */}
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


        </div>
    );
};

export default ExamScreen;
