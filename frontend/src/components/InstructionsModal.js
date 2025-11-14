// src/components/InstructionsModal.js
import React from 'react';

// Import our reusable StatusIndicator to show the icons in the legend
import { PaletteLegend } from './QuestionPalette'; // (You would need to export this from the palette file)

const InstructionsModal = ({ onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content instructions-modal">
                <h2>Exam Instructions & Legend</h2>
                <div className="instructions-content">
                    <h4>General Instructions:</h4>
                    <span style={{ fontWeight: "bolder", color: "#3b82f6" }}>Note the timer is ticking. Close this window to return to the questions</span>
                    <ul>
                        <li>Read each question carefully before answering.</li>
                        <li>You can navigate between questions using the "Next" and "Previous" buttons, or by clicking a number in the Question Palette.</li>
                        <li>Your answers are saved automatically when you navigate to another question.</li>
                        <li>If this is a timed exam, the timer in the top-right corner will count down. The exam will submit automatically when the time is up.</li>
                        <li>Do not switch tabs, minimize the window, or attempt to close the application. Doing so will result in immediate expulsion from the exam.</li>
                    </ul>

                    <h4>Question Palette Legend:</h4>
                    <div className="legend-grid">
                        <div className="legend-item-new">
                            <PaletteLegend status="answered" number="1" />
                        </div>
                        {/* <div className="legend-item-new">
                            <PaletteLegend status="notAnswered" number="2" />
                            <span>Not Answered</span>
                        </div>
                        <div className="legend-item-new">
                            <PaletteLegend status="markedForReview" number="3" />
                            <span>Marked for Review</span>
                        </div>
                        <div className="legend-item-new">
                            <PaletteLegend status="answeredAndMarked" number="4" />
                            <span>Answered & Marked</span>
                        </div> */}
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-primary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstructionsModal;