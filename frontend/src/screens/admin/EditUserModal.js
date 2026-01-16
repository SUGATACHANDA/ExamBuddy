import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

// Generic reusable modal for editing a user
const EditUserModal = ({ user, onClose, onSave, updateUrl, semesters = [], colleges = [] }) => {
    const [formData, setFormData] = useState({ name: '', email: '', collegeId: '', semester: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                collegeId: user.collegeId || '',
                semester: user.semester?._id || '',
                college: user.college?._id || ''
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

        if (!updateUrl) {
            setError("Configuration Error: No update URL was provided to the modal.");
            setLoading(false);
            return;
        }

        try {
            await api.put(updateUrl, formData);
            onSave();   // Refresh parent list
            onClose();  // Close modal
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
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>College ID / Roll No.</label>
                        <input
                            name="collegeId"
                            value={formData.collegeId}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* ✅ Semester dropdown for students */}
                    {user.role === 'student' && (
                        <div className="form-group">
                            <label>Semester</label>
                            <select
                                name="semester"
                                value={formData.semester}
                                onChange={handleChange}
                                className="filter-select"
                                required
                            >
                                <option value="">-- Select Semester --</option>
                                {semesters
                                    .sort((a, b) => a.number - b.number)
                                    .map((s) => (
                                        <option key={s._id} value={s._id}>
                                            Semester {s.number}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {user.role === 'university_affairs' && (
                        <div className="form-group">
                            <label>Assigned College</label>
                            <select
                                name="college"
                                value={formData.college}
                                onChange={handleChange}
                                required
                            >
                                <option value="">-- Select College --</option>
                                {colleges.map(c => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
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
