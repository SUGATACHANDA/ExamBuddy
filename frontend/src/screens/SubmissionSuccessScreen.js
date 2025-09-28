// src/screens/SubmissionSuccessScreen.js
import { useAuth } from '../context/AuthContext';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SubmissionSuccessScreen = () => {

    const navigate = useNavigate()
    const { clearContextSubmitHandler } = useAuth();
    useEffect(() => {
        clearContextSubmitHandler();
    }, [clearContextSubmitHandler]);

    // This function will tell the Electron main process to close the application.
    const handleCloseApp = () => {
        // We will add the 'close-app' IPC handler in electron.js
        navigate("/student/dashboard")
    };

    return (
        <div className="container success-screen">
            <h1>Exam Submitted Successfully!</h1>
            <p>Your answers have been recorded. You may now close the application.</p>
            <div className="success-actions">
                <button onClick={handleCloseApp} className="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
};

export default SubmissionSuccessScreen;