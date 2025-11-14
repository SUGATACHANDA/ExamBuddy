import React, { useEffect, useRef, useState } from "react";
import { getDescriptorFromVideo } from "../utils/faceUtils";
import api from "../api/axiosConfig";
import * as faceapi from "face-api.js"

const MAX_ATTEMPTS = 3;

const CaptureDescriptorModal = ({ isOpen, collegeId, onSuccess, onFail }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);

    const [status, setStatus] = useState("init");
    const [prompt, setPrompt] = useState("");
    const [attempts, setAttempts] = useState(0);
    const [verifying, setVerifying] = useState(false);
    const [showRetry, setShowRetry] = useState(false);
    const [isAligned, setIsAligned] = useState(false);

    // ✅ Start Camera
    useEffect(() => {
        if (!isOpen) return;

        let active = true;

        (async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user" },
                    audio: false,
                });

                if (!active) {
                    s.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    await videoRef.current.play();
                }
                setStatus("ready");
            } catch (err) {
                console.error("Camera error", err);
                setStatus("error");
            }
        })();

        return () => {
            active = false;
            stream?.getTracks().forEach(t => t.stop());
        };
    }, [isOpen]);

    // ✅ Live face detection + alignment prompts
    useEffect(() => {
        if (!isOpen || status !== "ready") return;

        const interval = setInterval(async () => {
            try {
                const det = await faceapi.detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions()
                );

                if (!det) {
                    setPrompt("Face not detected — come closer");
                    setIsAligned(false);
                    return;
                }

                const { box } = det;
                const { videoWidth, videoHeight } = videoRef.current;

                const cx = box.x + box.width / 2;
                const cy = box.y + box.height / 2;

                const xOffset = cx - videoWidth / 2;
                const yOffset = cy - videoHeight / 2;

                const alignedX = Math.abs(xOffset) < videoWidth * 0.08;
                const alignedY = Math.abs(yOffset) < videoHeight * 0.08;

                // ✅ Check directions FIRST
                if (!alignedY) {
                    if (yOffset < 0) setPrompt("⬇️ Move face DOWN");
                    else setPrompt("⬆️ Move face UP");
                    setIsAligned(false);
                    return;
                }

                if (!alignedX) {
                    if (xOffset < 0) setPrompt("⬅️ Move face LEFT");
                    else setPrompt("➡️ Move face RIGHT");
                    setIsAligned(false);
                    return;
                }

                // ✅ If perfectly centered
                setIsAligned(true);
                setPrompt("✅ PERFECT! Click Verify");

            } catch {
                setPrompt("Hold still and center your face");
            }
        }, 300);

        return () => clearInterval(interval);
    }, [isOpen, status]);

    // ✅ Verify Face
    const handleVerify = async () => {
        if (!isAligned) return;

        setVerifying(true);
        setPrompt("Verifying...");
        setStatus("verifying");

        try {
            const descriptor = await getDescriptorFromVideo(videoRef.current);
            const res = await api.post("/face/verify-descriptor", {
                collegeId,
                descriptor: Array.from(descriptor),
            });

            if (res.data?.match) {
                setPrompt("✅ Face Verified! Preparing exam...");

                // ✅ reload camera, then proceed
                setTimeout(() => window.location.reload(), 800);
                setTimeout(() => onSuccess && onSuccess(res.data), 1500);
                return;
            }

            handleFail();
        } catch (err) {
            console.error("Verification error", err);
            handleFail();
        }
    };

    const handleFail = () => {
        const newCount = attempts + 1;
        setAttempts(newCount);

        if (newCount >= MAX_ATTEMPTS) {
            setPrompt("❌ Max attempts reached");
            stopStream();
            setTimeout(() => onFail && onFail("max_attempts"), 1200);
        } else {
            setPrompt(`❌ Try again (${MAX_ATTEMPTS - newCount} left)`);
            setShowRetry(true);
            setVerifying(false);
            setStatus("ready");
        }
    };

    const stopStream = () => stream?.getTracks().forEach(t => t.stop());

    const retry = () => {
        setShowRetry(false);
        setPrompt("Center your face again");
    };

    if (!isOpen) return null;

    return (
        <div style={overlay}>
            <div style={modal}>
                <h2 style={{ marginBottom: 12, fontWeight: 700 }}>Face Verification</h2>

                <div style={{ position: "relative" }}>
                    <video ref={videoRef} autoPlay muted playsInline style={video} />
                    <div style={oval}></div>
                </div>

                <p style={promptText}>{prompt}</p>
                <p style={attemptText}>Attempts Left: {MAX_ATTEMPTS - attempts}</p>

                {!showRetry && status === "ready" && (
                    <button
                        style={isAligned && !verifying ? btn : btnDisabled}
                        onClick={isAligned ? handleVerify : null}
                        disabled={!isAligned || verifying}
                    >
                        {verifying ? "Verifying..." : "Verify Face"}
                    </button>
                )}

                {showRetry && (
                    <button style={btnRetry} onClick={retry}>
                        Retry
                    </button>
                )}

                {attempts >= MAX_ATTEMPTS && (
                    <button style={btnFail} onClick={() => onFail && onFail("failed")}>
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};

export default CaptureDescriptorModal;

/* ✅ UI Styles Below */
const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
};

const modal = {
    background: "#fff",
    padding: "22px 26px",
    borderRadius: "12px",
    width: "360px",
    textAlign: "center",
    boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
};

const video = {
    width: 300,
    height: 240,
    borderRadius: "10px",
    transform: "scaleX(-1)",
    objectFit: "cover",
    border: "2px solid #d1d5db",
};

const oval = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "38%",     // narrower
    height: "72%",    // tall oval
    transform: "translate(-50%, -50%)",
    border: "4px solid #1e90ff",
    borderRadius: "50% / 60%",
    boxShadow: "0 0 20px rgba(30,144,255,0.5)"
};

const promptText = {
    marginTop: 12,
    fontWeight: "600",
    fontSize: "15px",
    minHeight: "22px",
    color: "#1e40af",
};

const attemptText = {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: 8,
};

const btn = {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 18px",
    marginTop: 8,
    border: "none",
    borderRadius: "6px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
};

const btnDisabled = { ...btn, background: "#9ca3af", cursor: "not-allowed" };
const btnRetry = { ...btn, background: "#f59e0b" };
const btnFail = { ...btn, background: "#dc2626" };