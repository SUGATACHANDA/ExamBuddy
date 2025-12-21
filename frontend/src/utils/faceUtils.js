// src/utils/faceUtils.js
import * as faceapi from "face-api.js";

export const getModelPath = () => {
    if (window.location.protocol === "file:") {
        // Electron production build
        return `models`;
    } else {
        // Development server
        return `${process.env.PUBLIC_URL}/models`;
    }
};

/**
 * Load models from public/models. Call once at app start (e.g. App.js)
 */
export async function loadFaceModels() {
    const MODEL_URL = getModelPath();
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL), // Changed to Tiny version
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
}

/**
 * Given an <img> or <video> element, detect single face and return descriptor
 * Throws if no face detected.
 * options.detectorOptions can be TinyFaceDetectorOptions inputSize etc.
 */
export async function getDescriptorFromMedia(el, options = {}) {
    const detectorOptions =
        options.detectorOptions || new faceapi.TinyFaceDetectorOptions({ inputSize: 416 });
    const detection = await faceapi
        .detectSingleFace(el, detectorOptions)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!detection || !detection.descriptor) throw new Error("No face detected");
    return detection.descriptor; // Float32Array(128)
}

/**
 * Given a File (image) object, loads and returns descriptor
 */
export async function getDescriptorFromFile(file, options = {}) {
    // Convert ArrayBuffer to Blob first
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    const img = await faceapi.bufferToImage(blob);
    return getDescriptorFromMedia(img, options);
}

/**
 * Given a video element, will detect single face and return descriptor
 */
export async function getDescriptorFromVideo(videoEl, options = {}) {
    // Ensure video is playing, then run detection
    return getDescriptorFromMedia(videoEl, options);
}