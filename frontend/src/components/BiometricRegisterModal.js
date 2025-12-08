import React, { useState } from "react";
import { getDescriptorFromVideo } from "../utils/faceUtils";
import api from "../api/axiosConfig";

export default function BiometricRegisterModal({ isOpen, onComplete }) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-box">
                <h2>Biometric Registration</h2>
                <p>
                    Please look directly at the camera to complete your facial biometric registration.
                    This modal cannot be closed until registration is completed.
                </p>

                <video id="faceCam" autoPlay muted></video>

                <button
                    disabled={loading}
                    className="btn-primary"
                    onClick={async () => {
                        setLoading(true);
                        try {
                            const { descriptor, croppedImage } =
                                await getDescriptorFromVideo("faceCam");

                            await api.put("/student/biometric", {
                                descriptor: Array.from(descriptor),
                                photoBase64: croppedImage,
                            });

                            alert("Biometric registered successfully!");
                            onComplete();
                        } catch (err) {
                            alert("Failed to capture face. Try again.");
                        }
                        setLoading(false);
                    }}
                >
                    {loading ? "Processing..." : "Capture & Save"}
                </button>
            </div>
        </div>
    );
}
