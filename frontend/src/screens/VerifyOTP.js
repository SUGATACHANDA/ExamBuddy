// src/screens/VerifyOTP.js
import React, { useState, useEffect, useRef } from "react";

import { useNavigate } from "react-router-dom";
import api from "api/axiosConfig";

const VerifyOTP = ({ onVerified }) => {
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [message, setMessage] = useState("");
    const inputs = useRef([]);
    const navigate = useNavigate();
    const email = localStorage.getItem("resetEmail");
    const initialTimer = parseInt(localStorage.getItem("resendTimer") || "120", 10);
    const [timer, setTimer] = useState(initialTimer);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer((t) => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const handleChange = (value, index) => {
        if (/^[0-9]$/.test(value) || value === "") {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < 5) inputs.current[index + 1].focus();
            if (newOtp.join("").length === 6) handleVerify(newOtp.join(""));
        }
    };

    const handleVerify = async (code) => {
        try {
            await api.post("/auth/verify-otp", { email, otp: code });
            setMessage("OTP Verified!");
            onVerified(code);
            setTimeout(() => navigate("/reset-password"), 800);
        } catch (err) {
            setMessage(err.response?.data?.message || "Invalid OTP");
        }
    };

    const handleResend = async () => {
        try {
            const { data } = await api.post("/auth/request-otp", { email });
            setTimer(data.resendTimer);
            localStorage.setItem("resendTimer", data.resendTimer);
            setMessage("OTP resent. Check your email.");
        } catch (err) {
            setMessage(err.response?.data?.message || "Error resending OTP");
        }
    };

    return (
        <div className="auth-container">
            <h2>Verify OTP</h2>
            <div className="otp-grid">
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        type="text"
                        maxLength="1"
                        className="otp-input"
                        ref={(el) => (inputs.current[i] = el)}
                        value={digit}
                        onChange={(e) => handleChange(e.target.value, i)}
                    />
                ))}
            </div>
            <p className="auth-msg">{message}</p>
            <button
                className="auth-btn"
                onClick={handleResend}
                disabled={timer > 0}
            >
                {timer > 0
                    ? `Resend OTP in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`
                    : "Resend OTP"}
            </button>
        </div>
    );
};

export default VerifyOTP;
