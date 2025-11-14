import { useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import api from "../api/axiosConfig";

export const useFaceVerification = (videoRef, studentId) => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState("idle");
    const [verificationAttemptsLeft, setVerificationAttemptsLeft] = useState(3);

    // ✅ Load FaceAPI models once
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = "/models"; // ensure this folder is served from public/
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                console.log("[FaceAPI] Models loaded successfully");
                setModelsLoaded(true);
            } catch (err) {
                console.error("[FaceAPI] Error loading models:", err);
            }
        };

        loadModels();
    }, []);

    // ✅ Helper: compute descriptor from webcam frame
    const computeDescriptorFromVideoFrame = useCallback(async (videoElement) => {
        if (!videoElement) return null;
        try {
            const detection = await faceapi
                .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                console.warn("[FaceAPI] No face detected in frame");
                return null;
            }

            return detection.descriptor;
        } catch (err) {
            console.error("[FaceAPI] Error detecting face:", err);
            return null;
        }
    }, []);

    // ✅ verifyFace() — called by ExamScreen
    const verifyFace = useCallback(
        async (studentIdParam) => {
            if (!modelsLoaded) throw new Error("FaceAPI models not loaded");
            if (!videoRef?.current) throw new Error("No video reference available");

            try {
                const descriptor = await computeDescriptorFromVideoFrame(videoRef.current);
                if (!descriptor) throw new Error("No face detected");

                console.log("[FaceVerification] Sending descriptor to backend...");
                const { data } = await api.post("/face/verify", {
                    studentId: studentIdParam,
                    descriptor: Array.from(descriptor),
                });

                return data; // expected { match: boolean, similarity, distance }
            } catch (err) {
                console.error("[FaceVerification] Error verifying face:", err);
                throw err;
            }
        },
        [modelsLoaded, videoRef, computeDescriptorFromVideoFrame]
    );

    return {
        modelsLoaded,
        verifyFace,
        verificationModalOpen,
        setVerificationModalOpen,
        verificationStatus,
        setVerificationStatus,
        verificationAttemptsLeft,
        setVerificationAttemptsLeft,
    };
};
