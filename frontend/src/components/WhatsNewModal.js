// src/components/WhatsNewModal.js
import React from 'react';
import ReactMarkdown from 'react-markdown'; // A great library for rendering Markdown

const WhatsNewModal = ({ version, notes, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content whats-new-modal">
                <h2>What's New in Version {version}</h2>
                <div className="release-notes-content">
                    {/* Use ReactMarkdown to safely render notes from GitHub */}
                    <ReactMarkdown>{notes}</ReactMarkdown>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-primary">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WhatsNewModal;