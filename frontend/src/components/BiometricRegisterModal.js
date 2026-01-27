// import React, { useState, useEffect, useRef } from "react";
// import * as faceapi from "face-api.js";
// import api from "../api/axiosConfig";

// import AlertModal from "../components/ui/AlertModal";
// import { useAlert } from "../hooks/useAlert";
// import { getModelPath } from "utils/faceUtils";


// const MODEL_URL = getModelPath();

// export default function BiometricRegisterModal({
//     isOpen,
//     onComplete,
//     allowClose = false
// }) {
//     const [loading, setLoading] = useState(false);
//     const [modelsLoaded, setModelsLoaded] = useState(false);
//     const [statusMsg, setStatusMsg] = useState("Loading models...");
//     const [faceReady, setFaceReady] = useState(false);

//     const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

//     const videoRef = useRef(null);
//     const streamRef = useRef(null);
//     const boxRef = useRef(null);
//     const detectLoopRef = useRef(null);

//     // ------------------------- LOAD MODELS -------------------------
//     useEffect(() => {
//         let cancelled = false;

//         const loadAll = async () => {
//             try {
//                 setStatusMsg("Loading AI models...");
//                 await Promise.all([
//                     faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
//                     faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
//                     faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
//                     faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).catch(() => { }),
//                 ]);

//                 if (!cancelled) {
//                     setModelsLoaded(true);
//                     setStatusMsg("Models loaded — starting camera...");
//                 }
//             } catch (err) {
//                 console.error("Model load failed", err);
//                 if (!cancelled) setStatusMsg("Failed to load models.");
//             }
//         };

//         if (isOpen) loadAll();
//         return () => (cancelled = true);
//     }, [isOpen]);

//     // ------------------------- START CAMERA -------------------------
//     useEffect(() => {
//         if (!isOpen || !modelsLoaded) return;

//         let mounted = true;

//         const startCamera = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({
//                     video: { facingMode: "user" },
//                     audio: false,
//                 });

//                 if (!mounted) {
//                     stream.getTracks().forEach(t => t.stop());
//                     return;
//                 }

//                 streamRef.current = stream;

//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;

//                     // 🔴 CRITICAL FIX
//                     videoRef.current.onloadedmetadata = async () => {
//                         try {
//                             await videoRef.current.play();
//                             setStatusMsg("Camera started — align your face inside the box.");
//                         } catch (e) {
//                             console.error("Video play failed", e);
//                         }
//                     };
//                 }
//             } catch (err) {
//                 console.error("Camera error:", err);
//                 openAlert({
//                     type: "error",
//                     title: "Camera Blocked",
//                     message: "Enable camera permissions to continue.",
//                     confirmText: "OK"
//                 });
//             }
//         };

//         startCamera();

//         return () => {
//             mounted = false;
//             if (streamRef.current) {
//                 streamRef.current.getTracks().forEach(t => t.stop());
//                 streamRef.current = null;
//             }
//         };
//     }, [isOpen, modelsLoaded]);


//     // ------------------------- DETECTION LOOP -------------------------
//     useEffect(() => {
//         if (!isOpen || !modelsLoaded) return;

//         let running = true;

//         const runDetect = async () => {
//             if (
//                 !videoRef.current ||
//                 videoRef.current.readyState < 2 || // 🔴 WAIT FOR FRAME
//                 videoRef.current.videoWidth === 0
//             ) {
//                 setFaceReady(false);
//                 return;
//             }


//             try {
//                 const detection = await faceapi
//                     .detectSingleFace(
//                         videoRef.current,
//                         new faceapi.TinyFaceDetectorOptions({
//                             inputSize: 416,
//                             scoreThreshold: 0.4,
//                         })
//                     )
//                     .withFaceLandmarks()
//                     .withFaceDescriptor();

//                 if (!detection) {
//                     setFaceReady(false);
//                     setStatusMsg("No face detected.");
//                     return;
//                 }

//                 // Calculate face position
//                 const faceBox = detection.detection.box;
//                 const faceCenterX = faceBox.x + faceBox.width / 2;
//                 const faceCenterY = faceBox.y + faceBox.height / 2;

//                 const vW = videoRef.current.videoWidth;
//                 const vH = videoRef.current.videoHeight;

//                 const normX = faceCenterX / vW;
//                 const normY = faceCenterY / vH;

//                 const videoRect = videoRef.current.getBoundingClientRect();
//                 const boxRect = boxRef.current.getBoundingClientRect();

//                 const leftNorm = (boxRect.left - videoRect.left) / videoRect.width;
//                 const rightNorm = (boxRect.right - videoRect.left) / videoRect.width;
//                 const topNorm = (boxRect.top - videoRect.top) / videoRect.height;
//                 const bottomNorm =
//                     (boxRect.bottom - videoRect.top) / videoRect.height;

//                 const margin = 0.06;
//                 const inX = normX >= leftNorm + margin && normX <= rightNorm - margin;
//                 const inY = normY >= topNorm + margin && normY <= bottomNorm - margin;

//                 if (inX && inY) {
//                     setFaceReady(true);
//                     setStatusMsg("Perfect — hold still and press Capture.");
//                 } else {
//                     setFaceReady(false);
//                     setStatusMsg("Adjust your position inside the box.");
//                 }
//             } catch (err) {
//                 console.error("Detection error:", err);
//             }
//         };

//         detectLoopRef.current = setInterval(runDetect, 200);

//         return () => {
//             running = false;
//             clearInterval(detectLoopRef.current);
//         };
//     }, [isOpen, modelsLoaded]);

//     // ------------------------- CAPTURE -------------------------
//     const handleCapture = async () => {
//         if (!faceReady) {
//             openAlert({
//                 type: "warning",
//                 title: "Face Not Aligned",
//                 message: "Please align your face inside the box before capturing.",
//                 confirmText: "OK"
//             });
//             return;
//         }

//         setLoading(true);

//         try {
//             const detection = await faceapi
//                 .detectSingleFace(
//                     videoRef.current,
//                     new faceapi.TinyFaceDetectorOptions({
//                         inputSize: 224,
//                         scoreThreshold: 0.5,
//                     })
//                 )
//                 .withFaceLandmarks()
//                 .withFaceDescriptor();

//             if (!detection) throw new Error("No face detected");

//             const descriptor = Array.from(detection.descriptor);

//             // Snapshot face region
//             const box = detection.detection.box;
//             const regions = [new faceapi.Rect(box.x, box.y, box.width, box.height)];
//             const canvases = await faceapi.extractFaces(videoRef.current, regions);
//             const img64 = canvases[0]?.toDataURL("image/jpeg");

//             // Send to backend
//             await api.put("/student/biometric", {
//                 descriptor,
//                 photoBase64: img64,
//             });

//             openAlert({
//                 type: "success",
//                 title: "Success",
//                 message: "Biometric captured successfully.",
//                 confirmText: "Continue",
//                 onConfirm: async () => {
//                     closeAlert();
//                     onCloseModal();
//                     onComplete(await api.get("/auth/me").then(res => res.data));
//                 }
//             });
//         } catch (err) {
//             console.error(err);
//             openAlert({
//                 type: "error",
//                 title: "Capture Failed",
//                 message: "Try again.",
//                 confirmText: "Retry"
//             });
//         } finally {
//             setLoading(false);
//         }
//     };

//     // ------------------------- CLOSE BUTTON -------------------------
//     const onCloseModal = () => {
//         if (!allowClose) return; // prevent closing when biometric required

//         if (streamRef.current) {
//             streamRef.current.getTracks().forEach(t => t.stop());
//             streamRef.current = null;
//         }

//         if (detectLoopRef.current) {
//             clearInterval(detectLoopRef.current);
//             detectLoopRef.current = null;
//         }

//         setFaceReady(false);
//         setStatusMsg("Closed");
//         onComplete(false);
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="modal-backdrop">
//             <AlertModal
//                 {...alertConfig}
//                 isOpen={alertConfig.isOpen}
//                 onConfirm={() => {
//                     alertConfig.onConfirm?.();
//                     closeAlert();
//                 }}
//                 onCancel={() => {
//                     alertConfig.onCancel?.();
//                     closeAlert();
//                 }}
//             />

//             <div className="modal-box biometric-box">

//                 {/* NEW CLOSE BUTTON */}
//                 <button
//                     className="biometric-close-btn"
//                     disabled={!allowClose}
//                     onClick={onCloseModal}
//                 >
//                     ✕
//                 </button>

//                 <h2>Biometric Registration</h2>
//                 <p className="instruction">{statusMsg}</p>

//                 <div className="video-container">
//                     <video
//                         ref={videoRef}
//                         autoPlay
//                         muted
//                         playsInline
//                         className="video-feed"
//                         style={{ transform: "scaleX(-1)" }}
//                     />

//                     <div ref={boxRef} className={`blue-face-box ${faceReady ? "green-ready" : ""}`} />
//                 </div>

//                 <button
//                     disabled={loading || !modelsLoaded}
//                     className="btn-primary"
//                     onClick={handleCapture}
//                 >
//                     {loading ? "Processing..." : "Capture & Save"}
//                 </button>
//             </div>
//         </div>
//     );
// }





import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import api from "../api/axiosConfig";

import AlertModal from "../components/ui/AlertModal";
import { useAlert } from "../hooks/useAlert";
import { getModelPath } from "utils/faceUtils";

const MODEL_URL = getModelPath();

/* -------------------- BIOMETRIC STATES -------------------- */
const BIOMETRIC_STATE = {
    LOADING_MODELS: "LOADING_MODELS",
    STARTING_CAMERA: "STARTING_CAMERA",
    NO_FACE: "NO_FACE",
    FACE_OUTSIDE_BOX: "FACE_OUTSIDE_BOX",
    CALIBRATING: "CALIBRATING",
    BAD_POSTURE: "BAD_POSTURE",
    READY: "READY",
    CAPTURING: "CAPTURING",
    ERROR: "ERROR",
};

export default function BiometricRegisterModal({
    isOpen,
    onComplete,
    allowClose = false,
}) {
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [biometricState, setBiometricState] = useState(
        BIOMETRIC_STATE.LOADING_MODELS
    );
    const [postureHint, setPostureHint] = useState(null);
    const [faceReady, setFaceReady] = useState(false);

    const [alertConfig, , openAlert, closeAlert] = useAlert();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const boxRef = useRef(null);
    const streamRef = useRef(null);
    const detectLoopRef = useRef(null);

    const postureBufferRef = useRef([]);
    const neutralPostureRef = useRef(null);

    const BUFFER_SIZE = 12;

    /* -------------------- CANVAS SYNC -------------------- */
    const syncCanvasWithVideo = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const rect = video.getBoundingClientRect();

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    };

    /* -------------------- PROMPT -------------------- */
    const getPrompt = () => {
        switch (biometricState) {
            case BIOMETRIC_STATE.LOADING_MODELS:
                return "Loading secure biometric models…";
            case BIOMETRIC_STATE.STARTING_CAMERA:
                return "Starting camera…";
            case BIOMETRIC_STATE.NO_FACE:
                return "Place your face in front of the camera";
            case BIOMETRIC_STATE.FACE_OUTSIDE_BOX:
                return "Move your face inside the box";
            case BIOMETRIC_STATE.CALIBRATING:
                return "Hold still — calibrating posture";
            case BIOMETRIC_STATE.BAD_POSTURE:
                return postureHint || "Adjust your head position";
            case BIOMETRIC_STATE.READY:
                return "Perfect — press Capture";
            case BIOMETRIC_STATE.CAPTURING:
                return "Capturing biometric data…";
            default:
                return "";
        }
    };

    /* -------------------- LOAD MODELS -------------------- */
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        (async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                if (!cancelled) {
                    setModelsLoaded(true);
                    setBiometricState(BIOMETRIC_STATE.STARTING_CAMERA);
                }
            } catch {
                setBiometricState(BIOMETRIC_STATE.ERROR);
            }
        })();

        return () => (cancelled = true);
    }, [isOpen]);

    /* -------------------- START CAMERA -------------------- */
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "user" }, audio: false })
            .then(stream => {
                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = async () => {
                    await videoRef.current.play();
                    syncCanvasWithVideo();
                    setBiometricState(BIOMETRIC_STATE.NO_FACE);
                };
            })
            .catch(() => {
                openAlert({
                    type: "error",
                    title: "Camera Blocked",
                    message: "Enable camera permissions to continue.",
                    confirmText: "OK",
                });
            });

        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [isOpen, modelsLoaded]);

    /* -------------------- DETECTION LOOP -------------------- */
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        const runDetect = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            syncCanvasWithVideo();
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const detection = await faceapi
                .detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.4,
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setBiometricState(BIOMETRIC_STATE.NO_FACE);
                setFaceReady(false);
                return;
            }

            /* ---------- DRAW LANDMARKS ---------- */
            ctx.strokeStyle = faceReady ? "#22c55e" : "#3b82f6";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);

            const draw = pts => {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                pts.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            };

            const lm = detection.landmarks;
            draw(lm.getJawOutline());
            draw(lm.getLeftEye());
            draw(lm.getRightEye());
            draw(lm.getNose());
            draw(lm.getMouth());

            /* ---------- BOX CHECK ---------- */
            const box = detection.detection.box;
            const cx = (box.x + box.width / 2) / video.videoWidth;
            const cy = (box.y + box.height / 2) / video.videoHeight;

            const vr = video.getBoundingClientRect();
            const br = boxRef.current.getBoundingClientRect();
            const inBox =
                cx > (br.left - vr.left) / vr.width + 0.06 &&
                cx < (br.right - vr.left) / vr.width - 0.06 &&
                cy > (br.top - vr.top) / vr.height + 0.06 &&
                cy < (br.bottom - vr.top) / vr.height - 0.06;

            if (!inBox) {
                setBiometricState(BIOMETRIC_STATE.FACE_OUTSIDE_BOX);
                setFaceReady(false);
                return;
            }

            /* ---------- POSTURE ---------- */
            const jaw = lm.getJawOutline();
            const leftEye = lm.getLeftEye()[0];
            const rightEye = lm.getRightEye()[3];
            const nose = lm.getNose()[3];
            const chin = jaw[8];

            const yaw =
                (nose.x - (leftEye.x + rightEye.x) / 2) /
                (jaw[16].x - jaw[0].x);
            const pitch = (chin.y - nose.y) / (jaw[16].x - jaw[0].x);

            postureBufferRef.current.push({ yaw, pitch });
            if (postureBufferRef.current.length > BUFFER_SIZE)
                postureBufferRef.current.shift();

            if (postureBufferRef.current.length < BUFFER_SIZE) {
                setBiometricState(BIOMETRIC_STATE.CALIBRATING);
                setFaceReady(false);
                return;
            }

            if (!neutralPostureRef.current) {
                neutralPostureRef.current = { yaw, pitch };
                return;
            }

            const dy = yaw - neutralPostureRef.current.yaw;
            const dp = pitch - neutralPostureRef.current.pitch;

            const YAW_LIMIT = 0.035;
            const PITCH_LIMIT = 0.075;

            let hint = null;
            if (dy > YAW_LIMIT) hint = "➡ Turn head slightly right";
            else if (dy < -YAW_LIMIT) hint = "⬅ Turn head slightly left";
            else if (dp > PITCH_LIMIT) hint = "⬇ Tilt head down slightly";
            else if (dp < -PITCH_LIMIT) hint = "⬆ Tilt head up slightly";

            if (hint) {
                setPostureHint(hint);
                setBiometricState(BIOMETRIC_STATE.BAD_POSTURE);
                setFaceReady(false);
            } else {
                setPostureHint(null);
                setBiometricState(BIOMETRIC_STATE.READY);
                setFaceReady(true);
            }
        };

        detectLoopRef.current = setInterval(runDetect, 200);
        return () => clearInterval(detectLoopRef.current);
    }, [isOpen, modelsLoaded]);

    /* -------------------- CAPTURE -------------------- */
    const handleCapture = async () => {
        if (biometricState !== BIOMETRIC_STATE.READY) return;

        setLoading(true);
        setBiometricState(BIOMETRIC_STATE.CAPTURING);

        try {
            const detection = await faceapi
                .detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.4,
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            await api.put("/student/biometric", {
                descriptor: Array.from(detection.descriptor),
            });

            openAlert({
                type: "success",
                title: "Success",
                message: "Biometric registered.",
                confirmText: "Continue",
                onConfirm: () => {
                    closeAlert()
                    onComplete(true)
                }
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
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

            <div className="modal-box biometric-box">
                <h2>Biometric Registration</h2>
                <p className={`instruction ${faceReady ? "ok" : "warn"}`}>
                    {getPrompt()}
                </p>

                <div className="video-container" style={{ position: "relative" }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ transform: "scaleX(-1)" }}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            transform: "scaleX(-1)",
                            pointerEvents: "none",
                        }}
                    />
                    <div ref={boxRef} className="blue-face-box" />
                </div>

                <button
                    className="btn-primary"
                    disabled={!faceReady || loading}
                    onClick={handleCapture}
                >
                    {loading ? "Processing…" : "Capture & Save"}
                </button>
            </div>
        </div>
    );
}
