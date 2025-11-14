// src/components/FaceVerificationModal.js
import React from "react";

const FaceVerificationModal = ({
    isOpen,
    status = "idle",
    message = "",
    attemptsLeft = 3,
}) => {
    if (!isOpen) return null;

    let title = "";
    let color = "#fff";

    switch (status) {
        case "scanning":
            title = "🕵️ Verifying your identity...";
            color = "#0af";
            break;
        case "success":
            title = "✅ Face Verified Successfully!";
            color = "#00c853";
            break;
        case "failed":
            title = "❌ Face Mismatch Detected!";
            color = "#e53935";
            break;
        default:
            title = "Verifying...";
            color = "#fff";
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                flexDirection: "column",
                color: "#fff",
                textAlign: "center",
                padding: "1rem",
            }}
        >
            <div
                style={{
                    background: "#111",
                    borderRadius: "1rem",
                    padding: "2rem 3rem",
                    maxWidth: "400px",
                    boxShadow: "0 0 20px rgba(255,255,255,0.2)",
                }}
            >
                <h2 style={{ color }}>{title}</h2>
                <p style={{ marginTop: "1rem", fontSize: "1rem" }}>
                    {message ||
                        (status === "scanning"
                            ? "Please stay still and ensure your face is well lit."
                            : status === "failed"
                                ? `Attempts left: ${attemptsLeft}`
                                : "")}
                </p>

                {status === "success" && (
                    <p style={{ marginTop: "1rem", color: "#aaa" }}>
                        Redirecting to your exam...
                    </p>
                )}
            </div>
        </div>
    );
};

export default FaceVerificationModal;
