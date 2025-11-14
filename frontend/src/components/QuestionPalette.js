import React from 'react';

// =========================================================================
// == 1. A Reusable, Self-Contained Legend Component (Pure CSS)
// This is the legend that appears at the bottom of the palette.
// =========================================================================
export const PaletteLegend = () => (
    <div className="palette-legend-final">
        <div className="legend-item-final">
            <div className="indicator-shape answered"></div>
            Answered
        </div>
        <div className="legend-item-final">
            <div className="indicator-shape notAnswered"></div>
            Not Answered
        </div>
        <div className="legend-item-final">
            <div className="indicator-shape markedForReview"></div>
            Marked for Review
        </div>
        <div className="legend-item-final">
            <div className="indicator-shape answeredAndMarked"></div>
            Answered & Marked
        </div>
        {/* <div className="legend-item-final">
            <div className="indicator-shape notVisited"></div>
            Not Visited
        </div> */}
        <div className="legend-item-final">
            <div className="indicator-shape current"></div>
            Current Question
        </div>
    </div>
);


// =========================================================================
// == 2. The Main QuestionPalette Component
// This is the primary component for the right sidebar.
// =========================================================================
const QuestionPalette = ({ section, answers, currentQuestionId, onNavigate }) => {

    // A "guard clause" to prevent rendering errors if props are not ready.
    if (!section || !section.questions || !Array.isArray(section.questions)) {
        return (
            <div className="question-palette-final">
                <h3 className="palette-title">Loading...</h3>
            </div>
        );
    }


    return (
        <div className="question-palette-final">
            <h3 className="palette-title">{section.title}</h3>

            <div className="palette-grid-final">
                {section.questions.map((question, qIndex) => {
                    if (!question || !question._id) return null;

                    // ✅ Restart numbering for each section
                    const questionNumber = qIndex + 1;

                    const answer = answers.find(a => a.questionId === question._id);
                    const status = answer ? answer.status : 'notAnswered';
                    const isCurrent = currentQuestionId === question._id;

                    return (
                        <button
                            key={question._id}
                            className={`palette-button-final ${status} ${isCurrent ? 'current' : ''}`}
                            onClick={() => onNavigate(qIndex)}
                            title={status.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        >
                            {questionNumber}
                        </button>
                    );
                })}
            </div>

            {/* Render the legend at the bottom of the palette container */}
            {/* <PaletteLegend /> */}
        </div>
    );
};

export default QuestionPalette;