import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const EditQuestionModal = ({ question, onClose, onSave }) => {
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (question) {
            setQuestionText(question.questionText);
            setOptions(question.options);
            setCorrectAnswer(question.correctAnswer);
        }
    }, [question]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        if (options.includes(correctAnswer) === false) {
            setError('Correct answer must be one of the options.');
            return;
        }
        setLoading(true);
        try {
            await api.put(`/questions/${question._id}`, { questionText, options, correctAnswer });
            onSave(); // Trigger the parent to refetch
            onClose(); // Close the modal
        } catch (err) {
            setError('Failed to update question.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Question</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Question Text</label>
                        <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
                    </div>
                    {options.map((opt, index) => (
                        <div className="form-group" key={index}>
                            <label>Option {index + 1}</label>
                            <input type="text" value={opt} onChange={(e) => {
                                const newOpts = [...options];
                                newOpts[index] = e.target.value;
                                setOptions(newOpts);
                            }} required />
                        </div>
                    ))}
                    <div className="form-group">
                        <label>Correct Answer</label>
                        <select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} required>
                            <option value="" disabled>Select the correct option</option>
                            {options.filter(o => o).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditQuestionModal;