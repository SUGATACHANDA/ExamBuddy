// src/components/WarningModal.js
import React, { useState, useEffect } from 'react';

const WarningModal = ({ warningData, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // When we receive new warning data, make the modal visible
        if (warningData) {
            setIsVisible(true);

            // Set a timer to automatically close the modal after a few seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
                onClose(); // Notify parent that the modal has closed
            }, 4000); // Show for 4 seconds

            return () => clearTimeout(timer);
        }
    }, [warningData, onClose]); // This effect re-runs every time a new warning comes in

    if (!isVisible || !warningData) {
        return null;
    }

    return (
        <div className="warning-modal-overlay">
            <div className="warning-modal-content">
                <div className="warning-icon">⚠️</div>
                <h2>Security Warning</h2>
                <p>A forbidden action was detected: <strong>{warningData.type}</strong></p>
                <p className="warning-strike-count">
                    This is your <strong>warning {warningData.strike} of {warningData.max}</strong>.
                </p>
                <p>Exceeding the warning limit will result in immediate expulsion from the exam.</p>
            </div>
        </div>
    );
};

export default WarningModal;