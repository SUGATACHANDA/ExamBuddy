// src/components/CloseAppsConfirmModal.js
import React from 'react';

const CloseAppsConfirmModal = ({ isOpen, appList, onClose, onConfirm }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Confirm Application Closure</h2>
                <p>The following applications have been detected. To proceed, they will be forcibly closed. Please save any unsaved work.</p>

                <div className="app-list-container">
                    {appList.length > 0 ? (
                        <ul>
                            {appList.map((appName, index) => <li key={index}>{appName}</li>)}
                        </ul>
                    ) : (
                        <p>No other applications detected that need to be closed.</p>
                    )}
                </div>

                <p><strong>Are you sure you want to proceed?</strong></p>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className="btn btn-danger">Yes, Close Apps</button>
                </div>
            </div>
        </div>
    );
};

export default CloseAppsConfirmModal;