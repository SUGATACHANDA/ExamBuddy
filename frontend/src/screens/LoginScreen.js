import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <-- Make sure to import Link
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { togglePasswordVisibility } from 'utils/passwordToggle';

const LoginScreen = () => {
    // --- STATE MANAGEMENT ---
    const [collegeId, setCollegeId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // --- HOOKS ---
    const navigate = useNavigate();
    const { login } = useAuth();

    // --- EFFECT ---
    // Signal to main process that the UI is ready, so the splash screen can close.
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.sendLoginScreenReady) {
            window.electronAPI.sendLoginScreenReady();
        }
    }, []);


    // --- HANDLERS ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { collegeId, password });
            login(data);
            if (window.electronAPI) window.electronAPI.enterFullscreen();

            // Multi-Role Redirection Logic
            if (data.role === 'admin') navigate('/admin/dashboard');
            else if (data.role === 'university_affairs') navigate('/ua/dashboard');
            else if (data.role === 'HOD') navigate('/hod/dashboard');
            else if (data.role === 'teacher') navigate('/teacher/dashboard');
            else if (data.role === 'student') navigate('/student/dashboard');
            else navigate('/');
        } catch (err) {
            const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // Handler for the Exit Application button.
    const handleExitApp = () => {
        if (window.electronAPI && window.electronAPI.closeApp) {
            window.electronAPI.closeApp();
        }
    };

    return (
        <div className="container login-container">
            {/* --- THIS IS THE FIX for the EXIT BUTTON --- */}
            {/* Move the container to the top of the component's JSX. */}
            <div className="exit-app-container-tr">
                <button onClick={handleExitApp} className="btn-secondary" title="Exit Application">
                    Exit App
                </button>
            </div>
            {/* ------------------------------------------- */}

            <div className="login-box">
                <h1>Exam Proctoring System</h1>
                <p>Please enter your credentials to proceed.</p>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <p className="error">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="collegeId">College ID / Employee ID</label>
                        <input id="collegeId" type="text" value={collegeId} onChange={(e) => setCollegeId(e.target.value)} required disabled={loading} />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                        {/* <Tooltip content={showPassword ? "Hide password" : "Show password"} position="left"> */}
                        {showPassword ? (
                            <EyeOff
                                className="password-icon"
                                onClick={() => {
                                    togglePasswordVisibility('password');
                                    setShowPassword(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '65%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                }}

                            />
                        ) : (
                            <Eye
                                className="password-icon"
                                onClick={() => {
                                    togglePasswordVisibility('password');
                                    setShowPassword(true);
                                }}
                                xlinkTitle='Show Password'
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '65%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                }}
                            />
                        )}
                        {/* </Tooltip> */}
                    </div>

                    {/* --- THIS IS THE FIX for FORGOT PASSWORD --- */}
                    <div className="form-links">
                        <Link to="/forgot-password">Forgot Password?</Link>
                    </div>
                    {/* ----------------------------------------- */}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;