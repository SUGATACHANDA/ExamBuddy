import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const EditExamModal = ({ exam, onClose, onSave }) => {
    // State to manage the form fields
    const [title, setTitle] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [examType, setExamType] = useState('timed');
    const [duration, setDuration] = useState(60);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // When the component mounts or the `exam` prop changes, populate the form fields.
    useEffect(() => {
        if (exam) {
            setTitle(exam.title);

            // The datetime-local input requires a specific format: 'YYYY-MM-DDTHH:mm'.
            // This logic converts the UTC date from the DB to the user's local timezone for correct display.
            const localDate = new Date(exam.scheduledAt);
            localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
            setScheduledAt(localDate.toISOString().slice(0, 16));

            setExamType(exam.examType || 'untimed');
            if (exam.examType === 'timed') {
                setDuration(exam.duration || 60);
            }
        }
    }, [exam]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Convert the user's local datetime back to a standard UTC string before sending.
            const scheduledAtUTC = new Date(scheduledAt).toISOString();

            const payload = {
                title,
                scheduledAt: scheduledAtUTC,
                examType,
                duration: examType === 'timed' ? duration : undefined,
            };

            await api.put(`/exams/${exam._id}`, payload);

            onSave();  // Trigger the parent component to refetch data to show the update.
            onClose(); // Close the modal on success.
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update exam.');
        } finally {
            setLoading(false);
        }
    };

    if (!exam) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit Exam: "{exam.title}"</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Exam Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>New Schedule Time (in your local time)</label>
                        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Exam Type</label>
                        <select value={examType} onChange={e => setExamType(e.target.value)}>
                            <option value="timed">Timed</option>
                            <option value="untimed">Untimed</option>
                        </select>
                    </div>
                    {examType === 'timed' && (
                        <div className="form-group">
                            <label>Duration (in minutes)</label>
                            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} required min="1" />
                        </div>
                    )}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditExamModal;