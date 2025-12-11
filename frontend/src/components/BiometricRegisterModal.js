import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import api from "../api/axiosConfig";

import AlertModal from "../components/ui/AlertModal";
import { useAlert } from "../hooks/useAlert";

const MODEL_URL = "/models";

export default function BiometricRegisterModal({
    isOpen,
    onComplete,
    allowClose = false
}) {
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [statusMsg, setStatusMsg] = useState("Loading models...");
    const [faceReady, setFaceReady] = useState(false);

    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const boxRef = useRef(null);
    const detectLoopRef = useRef(null);

    // ------------------------- LOAD MODELS -------------------------
    useEffect(() => {
        let cancelled = false;

        const loadAll = async () => {
            try {
                setStatusMsg("Loading AI models...");
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).catch(() => { }),
                ]);

                if (!cancelled) {
                    setModelsLoaded(true);
                    setStatusMsg("Models loaded — starting camera...");
                }
            } catch (err) {
                console.error("Model load failed", err);
                if (!cancelled) setStatusMsg("Failed to load models.");
            }
        };

        if (isOpen) loadAll();
        return () => (cancelled = true);
    }, [isOpen]);

    // ------------------------- START CAMERA -------------------------
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        let mounted = true;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 1280, height: 720 },
                    audio: false,
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;

                setStatusMsg("Camera started — align your face inside the box.");
            } catch (err) {
                console.error("Camera error:", err);
                openAlert({
                    type: "error",
                    title: "Camera Blocked",
                    message: "Enable camera permissions to continue.",
                    confirmText: "OK"
                });
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, [isOpen, modelsLoaded, openAlert]);

    // ------------------------- DETECTION LOOP -------------------------
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        let running = true;

        const runDetect = async () => {
            if (!videoRef.current || !boxRef.current || !videoRef.current.videoWidth) {
                setFaceReady(false);
                return;
            }

            try {
                const detection = await faceapi
                    .detectSingleFace(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 224,
                            scoreThreshold: 0.5,
                        })
                    )
                    .withFaceLandmarks();

                if (!detection) {
                    setFaceReady(false);
                    setStatusMsg("No face detected.");
                    return;
                }

                // Calculate face position
                const faceBox = detection.detection.box;
                const faceCenterX = faceBox.x + faceBox.width / 2;
                const faceCenterY = faceBox.y + faceBox.height / 2;

                const vW = videoRef.current.videoWidth;
                const vH = videoRef.current.videoHeight;

                const normX = faceCenterX / vW;
                const normY = faceCenterY / vH;

                const videoRect = videoRef.current.getBoundingClientRect();
                const boxRect = boxRef.current.getBoundingClientRect();

                const leftNorm = (boxRect.left - videoRect.left) / videoRect.width;
                const rightNorm = (boxRect.right - videoRect.left) / videoRect.width;
                const topNorm = (boxRect.top - videoRect.top) / videoRect.height;
                const bottomNorm =
                    (boxRect.bottom - videoRect.top) / videoRect.height;

                const margin = 0.06;
                const inX = normX >= leftNorm + margin && normX <= rightNorm - margin;
                const inY = normY >= topNorm + margin && normY <= bottomNorm - margin;

                if (inX && inY) {
                    setFaceReady(true);
                    setStatusMsg("Perfect — hold still and press Capture.");
                } else {
                    setFaceReady(false);
                    setStatusMsg("Adjust your position inside the box.");
                }
            } catch (err) {
                console.error("Detection error:", err);
            }
        };

        detectLoopRef.current = setInterval(runDetect, 200);

        return () => {
            running = false;
            clearInterval(detectLoopRef.current);
        };
    }, [isOpen, modelsLoaded]);

    // ------------------------- CAPTURE -------------------------
    const handleCapture = async () => {
        if (!faceReady) {
            openAlert({
                type: "warning",
                title: "Face Not Aligned",
                message: "Please align your face inside the box before capturing.",
                confirmText: "OK"
            });
            return;
        }

        setLoading(true);

        try {
            const detection = await faceapi
                .detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 224,
                        scoreThreshold: 0.5,
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) throw new Error("No face detected");

            const descriptor = Array.from(detection.descriptor);

            // Snapshot face region
            const box = detection.detection.box;
            const regions = [new faceapi.Rect(box.x, box.y, box.width, box.height)];
            const canvases = await faceapi.extractFaces(videoRef.current, regions);
            const img64 = canvases[0]?.toDataURL("image/jpeg");

            // Send to backend
            await api.put("/student/biometric", {
                descriptor,
                photoBase64: img64,
            });

            openAlert({
                type: "success",
                title: "Success",
                message: "Biometric captured successfully.",
                confirmText: "Continue",
                onConfirm: () => {
                    closeAlert();
                    onCloseModal();
                    onComplete(true);
                }
            });
        } catch (err) {
            console.error(err);
            openAlert({
                type: "error",
                title: "Capture Failed",
                message: "Try again.",
                confirmText: "Retry"
            });
        } finally {
            setLoading(false);
        }
    };

    // ------------------------- CLOSE BUTTON -------------------------
    const onCloseModal = () => {
        if (!allowClose) return; // prevent closing when biometric required

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (detectLoopRef.current) {
            clearInterval(detectLoopRef.current);
            detectLoopRef.current = null;
        }

        setFaceReady(false);
        setStatusMsg("Closed");
        onComplete(false);
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

                {/* NEW CLOSE BUTTON */}
                <button
                    className="biometric-close-btn"
                    disabled={!allowClose}
                    onClick={onCloseModal}
                >
                    ✕
                </button>

                <h2>Biometric Registration</h2>
                <p className="instruction">{statusMsg}</p>

                <div className="video-container">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="video-feed"
                        style={{ transform: "scaleX(-1)" }}
                    />

                    <div ref={boxRef} className={`blue-face-box ${faceReady ? "green-ready" : ""}`} />
                </div>

                <button
                    disabled={loading || !modelsLoaded}
                    className="btn-primary"
                    onClick={handleCapture}
                >
                    {loading ? "Processing..." : "Capture & Save"}
                </button>
            </div>
        </div>
    );
}
