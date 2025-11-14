import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = (process.env.PUBLIC_URL || '') + '/models';

/**
 * useFaceTracking Hook
 * - Detects if a face is visible
 * - Warns if face absent >10s
 * - Expels if absent >20s
 * - Detects multiple faces (>1)
 *   -> shows brief warning at 100 ms
 *   -> expels after 5 s continuous detection
 */
export const useFaceTracking = (videoRef, onViolation, onFaceWarning, onMultipleFacesWarning) => {
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isFaceVisible, setIsFaceVisible] = useState(true);

    const intervalRef = useRef(null);
    const absenceStartRef = useRef(null);
    const hasWarnedRef = useRef(false);

    const multipleFaceStartRef = useRef(null);
    const hasShownMultiWarningRef = useRef(false);

    // Load face detection models once
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                ]);
                setIsModelsLoaded(true);
                console.log('[FaceTracking] Models loaded.');
            } catch (err) {
                console.error('[FaceTracking] Model load error:', err);
            }
        };
        loadModels();
    }, []);

    // Detection loop
    useEffect(() => {
        if (!isModelsLoaded || !videoRef.current) return;

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.25,
        });

        const checkFace = async () => {
            try {
                const detections = await faceapi
                    .detectAllFaces(videoRef.current, options)
                    .withFaceLandmarks(true);

                const now = Date.now();
                const faceCount = detections?.length || 0;

                // ========================
                // MULTIPLE FACE DETECTION
                // ========================
                if (faceCount > 1) {
                    if (!multipleFaceStartRef.current) {
                        multipleFaceStartRef.current = now;
                        hasShownMultiWarningRef.current = false;
                    }

                    const elapsed = now - multipleFaceStartRef.current;

                    // Show error for first 100ms (once)
                    if (!hasShownMultiWarningRef.current && elapsed > 100) {
                        console.warn('[PROCTORING] Multiple faces detected!');
                        onMultipleFacesWarning && onMultipleFacesWarning();
                        hasShownMultiWarningRef.current = true;
                    }

                    // Expel if persists >5s
                    if (elapsed > 5000) {
                        console.warn('[PROCTORING] Multiple faces >5s → expulsion');
                        onViolation && onViolation('MULTIPLE_FACES_DETECTED');
                        multipleFaceStartRef.current = null;
                        hasShownMultiWarningRef.current = false;
                    }
                } else {
                    multipleFaceStartRef.current = null;
                    hasShownMultiWarningRef.current = false;
                }

                // ========================
                // SINGLE FACE ABSENCE DETECTION
                // ========================
                if (faceCount === 0) {
                    if (!absenceStartRef.current) {
                        absenceStartRef.current = now;
                        hasWarnedRef.current = false;
                    }

                    const elapsed = now - absenceStartRef.current;

                    // Warn after 10s
                    if (elapsed > 100 && !hasWarnedRef.current) {
                        console.warn('[PROCTORING] Face missing >100ms → warning');
                        setIsFaceVisible(false);
                        hasWarnedRef.current = true;
                        onFaceWarning && onFaceWarning();
                    }

                    // Expel after 20s
                    if (elapsed > 5000) {
                        console.warn('[PROCTORING] Face missing >5s → expulsion');
                        onViolation && onViolation('FACE_NOT_VISIBLE');
                        absenceStartRef.current = null;
                        hasWarnedRef.current = false;
                    }
                } else {
                    // Reset when at least one face is visible
                    if (!isFaceVisible) setIsFaceVisible(true);
                    absenceStartRef.current = null;
                    hasWarnedRef.current = false;
                }
            } catch (err) {
                console.error('[FaceTracking] Detection error:', err);
            }
        };

        intervalRef.current = setInterval(checkFace, 500);
        return () => clearInterval(intervalRef.current);
    }, [isModelsLoaded, videoRef, onViolation, onFaceWarning, onMultipleFacesWarning, isFaceVisible]);

    return isFaceVisible;
};
