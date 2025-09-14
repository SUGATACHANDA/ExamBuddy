// src/screens/SubmissionSuccessScreen.js
import React from 'react';

const SubmissionSuccessScreen = () => {

    // This function will tell the Electron main process to close the application.
    const handleCloseApp = () => {
        // We will add the 'close-app' IPC handler in electron.js
        if (window.electronAPI && window.electronAPI.closeApp) {
            window.electronAPI.closeApp();
        }
    };

    return (
        <div className="container success-screen">
            <h1>Exam Submitted Successfully!</h1>
            <p>Your answers have been recorded. You may now close the application.</p>
            <div className="success-actions">
                <button onClick={handleCloseApp} className="btn btn-primary">
                    Close Application
                </button>
            </div>
        </div>
    );
};

export default SubmissionSuccessScreen;