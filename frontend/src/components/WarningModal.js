// src/components/WarningModal.js
import React, { useEffect } from 'react';


const WarningModal = ({ isOpen, onClose, data }) => {
    const { title, message } = data || {};

    // Close modal when pressing ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose && onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <div className="warning-modal-overlay" onClick={onClose}>
            <div
                className="warning-modal-content"
                onClick={(e) => e.stopPropagation()} // prevent close on inner click
            >
                <div className="warning-header">
                    <span role="img" aria-label="warning" className="warning-icon">
                        ⚠️
                    </span>
                    <h2>{title || 'Warning'}</h2>
                </div>

                <p className="warning-message">{message || 'Something went wrong.'}</p>

                <button className="warning-close-btn" onClick={onClose}>
                    OK
                </button>
            </div>
        </div>
    );
};

export default WarningModal;
