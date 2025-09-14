// src/components/PermissionRequestModal.js
import React from 'react';

// Define the content for each permission type
const permissionContent = {
    camera: {
        title: 'Camera Access Required',
        body: 'We need to access your camera for video proctoring. Please click "Grant Access" and then "Allow" in the browser prompt.',
        icon: '📷', // You can replace this with an actual icon
    },
    microphone: {
        title: 'Microphone Access Required',
        body: 'Next, we need access to your microphone for audio proctoring. Please click "Grant Access" and then "Allow" in the browser prompt.',
        icon: '🎤',
    },
    close_apps: {
        title: 'Final Security Step',
        body: 'To ensure a fair testing environment, all other applications must be closed. This includes browsers, chat apps, and background utilities. Please save your work elsewhere. Click "Proceed" to close other applications and start the exam.',
        icon: '🔒',
    },
};

const PermissionRequestModal = ({ permissionType, onGrant, isRequesting }) => {
    if (!permissionType) return null;

    const content = permissionContent[permissionType];

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>{content.icon}</span>
                <h2>{content.title}</h2>
                <p>{content.body}</p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button onClick={onGrant} className="btn" disabled={isRequesting}>
                        {isRequesting ? 'Waiting for response...' : 'Grant Access'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionRequestModal;