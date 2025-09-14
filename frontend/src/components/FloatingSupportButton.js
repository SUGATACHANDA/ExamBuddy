// src/components/FloatingSupportButton.js
import React, { useState } from 'react';
import { Headset } from "lucide-react"

// You can replace these with your actual contact details
const SUPPORT_EMAIL = 'support@examproctor.com';
const SUPPORT_PHONE = '+1-800-555-EXAM';

const FloatingSupportButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Toggle the open/closed state of the support menu
    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`fab-container ${isOpen ? 'open' : ''}`}>
            {/* The menu items appear when the button is clicked */}
            <div className="fab-menu">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="fab-item">
                    <span className="fab-item-text">Email Support</span>
                    <div className="fab-icon-wrapper">
                        {/* A simple email icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                </a>
                <a href={`tel:${SUPPORT_PHONE}`} className="fab-item">
                    <span className="fab-item-text">Call Us</span>
                    <div className="fab-icon-wrapper">
                        {/* A simple phone icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                </a>
            </div>

            {/* The main circular button */}
            <button onClick={toggleMenu} className="fab-button" title="Contact Support">
                {/* 
                  Simple CSS-animated icon that toggles between a question mark and an 'X'
                */}
                <div className="fab-icon-open">
                    <Headset />
                </div>
                <div className="fab-icon-close">&times;</div>
            </button>
        </div>
    );
};

export default FloatingSupportButton;