// src/components/FloatingSupportButton.js
import React, { useState } from "react";
import { Headset, Phone, Mail, X } from "lucide-react";

const SUPPORT_EMAIL = "support@examproctor.com";
const SUPPORT_PHONE = "+91-9748278005";

const FloatingSupportButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => setIsOpen((prev) => !prev);

    return (
        <div className="support-widget-container">
            {isOpen && (
                <div className="support-card">
                    <div className="support-card-header">
                        <h3>Need Help?</h3>
                        <button className="close-btn" onClick={toggleMenu}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="support-info">
                        <div className="support-item">
                            <div className="icon-wrapper email">
                                <Mail size={20} />
                            </div>
                            <div className="support-text">
                                <span>Email us</span>
                                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                            </div>
                        </div>

                        <div className="support-item">
                            <div className="icon-wrapper phone">
                                <Phone size={20} />
                            </div>
                            <div className="support-text">
                                <span>Call us</span>
                                <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button className="support-fab" onClick={toggleMenu}>
                <Headset size={300} />
            </button>
        </div>
    );
};

export default FloatingSupportButton;
