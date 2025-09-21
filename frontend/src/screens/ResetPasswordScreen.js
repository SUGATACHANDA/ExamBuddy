import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';

const ResetPasswordScreen = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useParams(); // Gets the reset token from the URL

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) return setError("Passwords do not match.");
        setLoading(true); setMessage(''); setError('');
        try {
            const { data } = await api.put(`/auth/reset-password/${token}`, { password });
            setMessage(data.message);
        } catch (err) { setError(err.response?.data?.message || 'Failed to reset password.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="container login-container">
            <div className="login-box">
                <h2>Reset Your Password</h2>
                {message && <p className="success">{message}</p>}
                {error && <p className="error">{error}</p>}
                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                        <div className="form-group"><label>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Resetting...' : 'Set New Password'}</button>
                    </form>
                )}
                {message && (
                    <div className="form-links">
                        <Link to="/login">Proceed to Login</Link>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ResetPasswordScreen;