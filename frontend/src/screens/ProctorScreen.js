import { Clock, Mail, Phone, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProctorScreen = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleBack = () => {
        navigate(-1);
    };

    const handleSupportClick = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="proctor-container">
            <div className="proctor-content">
                <div className="header-section">
                    <button className="back-button" onClick={handleBack}>
                        Back to Dashboard
                    </button>
                    <h1>Proctoring System</h1>
                </div>

                <div className="status-section">
                    <div className="status-badge">Coming Soon</div>
                    <h2>Real-time Proctoring Feature</h2>
                    <p className="description">
                        This feature is currently under active development and will be available in our future release.
                    </p>
                </div>

                <div className="features-section">
                    <h3>Planned Features</h3>
                    <div className="features-list">
                        <div className="feature">
                            <div className="feature-dot"></div>
                            <span>Live video monitoring of exam sessions</span>
                        </div>
                        <div className="feature">
                            <div className="feature-dot"></div>
                            <span>AI-powered suspicious behavior detection</span>
                        </div>
                        <div className="feature">
                            <div className="feature-dot"></div>
                            <span>Multi-student proctoring dashboard</span>
                        </div>
                        <div className="feature">
                            <div className="feature-dot"></div>
                            <span>Real-time violation alerts and logging</span>
                        </div>
                    </div>
                </div>

                <div className="progress-section">
                    <div className="progress-header">
                        <span>Development Progress</span>
                        <span>2%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                </div>

                <div className="contact-section">
                    <p>For questions about upcoming features, please contact our support team.</p>
                    <button className="support-button" onClick={handleSupportClick}>
                        Contact Support
                    </button>
                </div>

                {/* Contact Support Modal */}
                {isModalOpen && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Need Help?</h3>
                                <button className="close-button" onClick={closeModal}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="contact-info">
                                    <div className="contact-item">
                                        <div className="contact-icon">
                                            <Mail size={20} />
                                        </div>
                                        <div className="contact-details">
                                            <strong>Email us</strong>
                                            <a href="mailto:support@exambuddy.com" className="contact-link">
                                                support@exambuddy.com
                                            </a>
                                        </div>
                                    </div>
                                    <div className="contact-item">
                                        <div className="contact-icon">
                                            <Phone size={20} />
                                        </div>
                                        <div className="contact-details">
                                            <strong>Call us</strong>
                                            <a href="tel:+919748278005" className="contact-link">
                                                +91-9748278005
                                            </a>
                                        </div>
                                    </div>
                                    <div className="contact-item">
                                        <div className="contact-icon">
                                            <Clock size={20} />
                                        </div>
                                        <div className="contact-details">
                                            <strong>Business Hours</strong>
                                            <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                                        </div>
                                    </div>
                                    <div className="contact-item">
                                        <div className="contact-icon">
                                            <Zap size={20} />
                                        </div>
                                        <div className="contact-details">
                                            <strong>Response Time</strong>
                                            <p>Typically within 2 business hours</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="modal-close-btn" onClick={closeModal}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProctorScreen;