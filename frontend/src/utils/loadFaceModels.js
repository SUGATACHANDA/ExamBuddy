import * as faceapi from "face-api.js";

export async function loadFaceModels() {
    const MODEL_URL = "/models"; // public/models folder

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) // optional but recommended
    ]);

    console.log("Face API models loaded");
}
