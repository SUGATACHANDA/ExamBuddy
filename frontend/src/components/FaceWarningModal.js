// src/components/FaceWarningModal.js
import React, { useEffect } from 'react';

const FaceWarningModal = ({ isOpen, onClose, message, autoClose = false, isFaceVisible }) => {
    // Auto-close when face becomes visible again
    useEffect(() => {
        if (autoClose && isOpen && isFaceVisible) {
            onClose && onClose();
        }
    }, [autoClose, isOpen, isFaceVisible, onClose]);

    // Close modal when pressing ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose && onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                zIndex: 9999,
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                style={{
                    background: '#1e1e1e',
                    border: '2px solid #ff0000ff',
                    borderRadius: '12px',
                    padding: '24px 36px',
                    textAlign: 'center',
                    boxShadow: '0 0 25px rgba(253, 10, 10, 1)',
                    maxWidth: '420px',
                    width: '90%',
                }}
            >
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️ WARNING</div>
                <p>{message || 'Face not detected — Please return to camera view!'}</p>
            </div>
        </div>
    );
};

export default FaceWarningModal;
