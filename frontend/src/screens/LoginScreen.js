import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
    // State hooks to manage the form's input fields
    const [collegeId, setCollegeId] = useState('');
    const [password, setPassword] = useState('');

    // State for providing user feedback (loading and error messages)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Hooks from libraries for navigation and authentication
    const navigate = useNavigate();
    const { login } = useAuth(); // Get the login function from our global AuthContext

    /**
     * Handles the form submission process when the user clicks "Login".
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent the default browser form submission (page reload)
        setLoading(true);   // Disable the button and show a loading state
        setError('');       // Clear any previous error messages

        try {
            // Send the login credentials to the backend API
            const { data } = await api.post('/auth/login', { collegeId, password });

            // If the API call is successful, update the global auth state
            login(data);

            // --- CRITICAL: Multi-Role Redirection Logic ---
            // Navigate the user to the correct dashboard based on their role.
            if (data.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (data.role === 'university_affairs') {
                navigate('/ua/dashboard');
            } else if (data.role === 'HOD') {
                navigate('/hod/dashboard');
            } else if (data.role === 'teacher') {
                navigate('/teacher/dashboard');
            } else if (data.role === 'student') {
                navigate('/student/dashboard');
            } else {
                // Fallback for any unknown roles, though this should not happen
                navigate('/');
            }

        } catch (err) {
            // If the API call fails, display a user-friendly error message.
            const message = err.response?.data?.message || 'Login failed. Please check your credentials and try again.';
            setError(message);
            console.error("Login Error:", err);
        } finally {
            // This block runs regardless of whether the try or catch block succeeded.
            // It's crucial for re-enabling the form button.
            setLoading(false);
        }
    };

    return (
        <div className="container login-container">
            <div className="login-box">
                <h1>Exam Proctoring System</h1>
                <p>Please enter your credentials to proceed.</p>
                <form onSubmit={handleSubmit} className="login-form">

                    {error && <p className="error">{error}</p>}

                    <div className="form-group">
                        <label htmlFor="collegeId">College ID / Employee ID</label>
                        <input
                            type="text"
                            id="collegeId"
                            value={collegeId}
                            onChange={(e) => setCollegeId(e.target.value)}
                            placeholder="Enter your assigned ID"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;