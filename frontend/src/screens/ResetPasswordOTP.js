// src/screens/ResetPasswordOTP.js
import React, { useState } from "react";

import api from "api/axiosConfig";

const ResetPasswordOTP = ({ email, otp, onDone }) => {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (password !== confirm) {
            setMessage("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/reset-password-otp", {
                email,
                otp,
                newPassword: password,
            });
            setMessage("Password reset successful. Redirecting...");
            setTimeout(() => onDone(), 1500);
        } catch (err) {
            setMessage(err.response?.data?.message || "Error resetting password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Reset Password</h2>
            <input
                className="auth-input"
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
            />
            <input
                className="auth-input"
                type="password"
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
            />
            <button className="auth-btn" onClick={handleReset}>
                {loading ? "Resetting Password..." : "Reset Password"}
            </button>
            <p className="auth-msg">{message}</p>
        </div>
    );
};

export default ResetPasswordOTP;
