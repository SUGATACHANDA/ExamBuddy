import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const ForgotPasswordScreen = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setMessage(''); setError('');
        try {
            const { data } = await api.post('/auth/request-otp', { email });
            setMessage(data.message);
            localStorage.setItem("resetEmail", email);
            localStorage.setItem("resendTimer", data.resendTimer);
            navigate("/verify-otp");
        } catch (err) { setError(err.response?.data?.message || 'An error occurred.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="container login-container">
            <div className="login-box">
                <h2>Forgot Password</h2>
                {message && <p className="success">{message}</p>}
                {error && <p className="error">{error}</p>}
                {!message && (
                    <p>Enter your registered email address. If an account exists, we will send a password reset link to it.</p>
                )}
                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label>Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                        <button type="submit" disabled={loading} style={{ "margin-top": "25px" }} className="btn-primary">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                    </form>
                )}
                <div className="form-links">
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};
export default ForgotPasswordScreen;