// src/screens/RequestOTP.js
import React, { useState } from "react";
import api from "api/axiosConfig";
import { useNavigate } from "react-router-dom";

const RequestOTP = ({ onSuccess }) => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate()

    const handleRequest = async () => {
        setLoading(true)
        try {
            const { data } = await api.post("/auth/request-otp", { email });
            setMessage("OTP sent! Check your email.");
            onSuccess(email);
            localStorage.setItem("resetEmail", email);
            localStorage.setItem("resendTimer", data.resendTimer);
            navigate("/verify-otp");

        } catch (err) {
            setMessage(err.response?.data?.message || "Error sending OTP");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Password Reset</h2>
            <input
                className="auth-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
            />
            <button className="auth-btn" disabled={loading} onClick={handleRequest}>
                {loading ? "Sending OTP..." : "Request OTP"}
            </button>
            <p className="auth-msg">{message}</p>
            <p className="auth-link" onClick={() => navigate("/login")}>
                &larr;Back to Login
            </p>
        </div>
    );
};

export default RequestOTP;
