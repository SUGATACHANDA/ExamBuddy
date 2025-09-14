// src/components/PermissionModal.js
import React from 'react';

const PermissionModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Permissions Required</h2>
                <p>To ensure a secure and proctored exam environment, this application requires access to the following:</p>
                <ul>
                    <li><strong>Camera:</strong> To monitor your video feed during the exam.</li>
                    <li><strong>Microphone:</strong> To monitor your audio feed during the exam.</li>
                    <li><strong>Screen Capture:</strong> To monitor your screen activity.</li>
                </ul>
                <p>
                    Failure to provide these permissions will result in your inability to start the exam and may lead to expulsion.
                    Please click "Accept" to allow the browser to request these permissions.
                </p>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={onConfirm} className="btn-secondary">Accept and Proceed</button>
                </div>
            </div>
        </div>
    );
};

export default PermissionModal;