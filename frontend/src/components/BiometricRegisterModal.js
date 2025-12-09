import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import api from "../api/axiosConfig";

import AlertModal from "../components/ui/AlertModal";
import { useAlert } from "../hooks/useAlert"

// change this to the path where you placed face-api models (public/models)
const MODEL_URL = "/models";

export default function BiometricRegisterModal({ isOpen, onComplete }) {
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [statusMsg, setStatusMsg] = useState("Loading models...");
    const [faceReady, setFaceReady] = useState(false);
    const [alertConfig, setAlertConfig, openAlert, closeAlert] = useAlert();

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const boxRef = useRef(null);
    const detectLoopRef = useRef(null);

    // 1️⃣ Load models once (tiny face detector + landmarks + recognition)
    useEffect(() => {
        let cancelled = false;
        const loadAll = async () => {
            try {
                setStatusMsg("Loading AI models...");
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    // optional:
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
        return () => { cancelled = true; };
    }, [isOpen]);

    // 2️⃣ Start camera when modal open & models loaded
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        let mounted = true;
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                if (!mounted) {
                    // if component unmounted, stop stream
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setStatusMsg("Camera started — position your face in the blue box");
            } catch (err) {
                console.error("Camera access error:", err);
                openAlert({
                    type: "error",
                    title: "Camera Blocked",
                    message: "Unable to access camera. Please allow camera permissions in your browser and try again.",
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

    // 3️⃣ Detection loop — normalized coordinate check
    useEffect(() => {
        if (!isOpen || !modelsLoaded) return;

        let running = true;
        const intervalMs = 200; // detection frequency

        const runDetect = async () => {
            if (!videoRef.current || !boxRef.current || !videoRef.current.videoWidth) {
                setFaceReady(false);
                setStatusMsg("Preparing camera...");
                return;
            }

            try {
                // detect single face with landmarks
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                    .withFaceLandmarks();

                if (!detection) {
                    setFaceReady(false);
                    setStatusMsg("No face detected. Look at the camera.");
                    return;
                }

                // face box center in video pixel coordinates (video internal resolution)
                const faceBox = detection.detection.box;
                const faceCenterX = faceBox.x + faceBox.width / 2;
                const faceCenterY = faceBox.y + faceBox.height / 2;
                const vW = videoRef.current.videoWidth;
                const vH = videoRef.current.videoHeight;

                // normalized face center (0..1)
                const normX = faceCenterX / vW;
                const normY = faceCenterY / vH;

                // compute blue box bounds relative to video element on screen
                const videoRect = videoRef.current.getBoundingClientRect();
                const boxRect = boxRef.current.getBoundingClientRect();

                // normalized blue box coords relative to the video DOM element
                const leftNorm = (boxRect.left - videoRect.left) / videoRect.width;
                const rightNorm = (boxRect.right - videoRect.left) / videoRect.width;
                const topNorm = (boxRect.top - videoRect.top) / videoRect.height;
                const bottomNorm = (boxRect.bottom - videoRect.top) / videoRect.height;

                // allow a small margin tolerance
                const margin = 0.06; // 6% tolerance
                const inX = normX >= (leftNorm + margin) && normX <= (rightNorm - margin);
                const inY = normY >= (topNorm + margin) && normY <= (bottomNorm - margin);

                if (inX && inY) {
                    setFaceReady(true);
                    setStatusMsg("Perfect — hold still. Press Capture.");
                } else {
                    setFaceReady(false);
                    // guide user
                    let hint = "";
                    if (normX < leftNorm) hint = "Move face right";
                    else if (normX > rightNorm) hint = "Move face left";
                    else if (normY < topNorm) hint = "Move face down";
                    else if (normY > bottomNorm) hint = "Move face up";
                    else hint = "Center your face in the box";
                    setStatusMsg(hint);
                }
            } catch (err) {
                console.error("Detection error", err);
                setFaceReady(false);
                setStatusMsg("Detection error. Try again.");
            }
        };

        // run loop
        detectLoopRef.current = setInterval(() => {
            if (running) runDetect();
        }, intervalMs);

        return () => {
            running = false;
            if (detectLoopRef.current) {
                clearInterval(detectLoopRef.current);
                detectLoopRef.current = null;
            }
        };
    }, [isOpen, modelsLoaded]);

    // 4️⃣ Capture handler — runs withFaceDescriptor to get descriptor
    const handleCapture = async () => {
        if (!modelsLoaded) {
            alert("Models still loading. Please wait.");
            return;
        }
        if (!videoRef.current) {
            alert("Camera not ready");
            return;
        }
        if (!faceReady) {
            alert("Please align your face inside the box before capturing.");
            return;
        }

        setLoading(true);
        try {
            // detect with descriptor
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection || !detection.descriptor) {
                throw new Error("No descriptor returned");
            }

            // crop/canvas snapshot: draw the face area to canvas (optional)
            const box = detection.detection.box;
            const regionsToExtract = [new faceapi.Rect(box.x, box.y, box.width, box.height)];
            const canvases = await faceapi.extractFaces(videoRef.current, regionsToExtract);

            let croppedBase64 = null;
            if (canvases && canvases.length > 0) {
                croppedBase64 = canvases[0].toDataURL("image/jpeg");
            } else {
                // fallback: capture full frame
                const canvas = document.createElement("canvas");
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                croppedBase64 = canvas.toDataURL("image/jpeg");
            }

            // descriptor is Float32Array
            const descriptorArray = Array.from(detection.descriptor);

            // send to backend
            const res = await api.put("/student/biometric", {
                descriptor: descriptorArray,
                photoBase64: croppedBase64,
            });

            openAlert({
                type: "success",
                title: "Biometric Registered",
                message: "Your face has been captured successfully.",
                confirmText: "Continue",
                onConfirm: async () => {

                    // Stop camera only now
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(t => t.stop());
                        streamRef.current = null;
                    }

                    // Fetch updated user data
                    const fresh = await api.get("/auth/me");

                    // NOW, AND ONLY NOW, update dashboard
                    onComplete(fresh.data);
                }
            });
        } catch (err) {
            console.error("Capture error:", err);
            alert("Failed to capture face. Try again.");
        } finally {
            setLoading(false);
        }
    };

    // If modal closed — cleanup
    useEffect(() => {
        if (!isOpen) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (detectLoopRef.current) {
                clearInterval(detectLoopRef.current);
                detectLoopRef.current = null;
            }
            setStatusMsg("Closed");
            setFaceReady(false);
        }
    }, [isOpen]);

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
            <div className="modal-box">
                <h2>Biometric Registration</h2>
                <p className="instruction">{statusMsg}</p>

                <div className="video-container">
                    <video
                        ref={videoRef}
                        id="faceCam"
                        autoPlay
                        muted
                        playsInline
                        className="video-feed"
                        style={{ transform: "scaleX(-1)" }} /* mirror preview */
                    />
                    <div
                        ref={boxRef}
                        className={`blue-face-box ${faceReady ? "green-ready" : ""}`}
                        aria-hidden
                    />
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
