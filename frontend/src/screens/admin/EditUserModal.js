import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

// This is now a generic, reusable modal.
// It REQUIRES an `updateUrl` prop to know which API endpoint to call.
const EditUserModal = ({ user, onClose, onSave, updateUrl }) => {
    const [formData, setFormData] = useState({ name: '', email: '', collegeId: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                collegeId: user.collegeId,
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // --- THIS IS THE DEFINITIVE FIX ---
        // We first check if a specific updateUrl was provided. This is a critical guard.
        if (!updateUrl) {
            setError("Configuration Error: No update URL was provided to the modal.");
            setLoading(false);
            return;
        }
        // ------------------------------------

        try {
            console.log(`Submitting user update to the provided URL: ${updateUrl}`);
            await api.put(updateUrl, formData); // Use the provided URL
            onSave(); // Refresh parent component's list
            onClose(); // Close modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Edit User: {user.name}</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>College ID / Roll No.</label>
                        <input name="collegeId" value={formData.collegeId} onChange={handleChange} required />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default EditUserModal;