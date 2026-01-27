import React, { useState, useEffect } from 'react';
import api from '../../api/axiosConfig';
import CollegeAsyncSelect from '../../components/ui/CollegeAsyncSelect';

// Generic reusable modal for editing a user
const EditUserModal = ({ user, onClose, onSave, updateUrl, semesters = [], colleges = [], department = [] }) => {
    const [formData, setFormData] = useState({ name: '', email: '', collegeId: '', semester: '', college: '', department: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDepartmentOption, setSelectedDepartmentOption] = useState(null);

    useEffect(() => {
        if (
            user?.department &&
            Array.isArray(department) &&
            department.length > 0
        ) {
            const dept = department.find(d => d._id === user.department);

            if (dept) {
                setSelectedDepartmentOption({
                    value: dept._id,
                    label: dept.name
                });
            }
        }
    }, [user, department]);

    console.log(selectedDepartmentOption);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                collegeId: user.collegeId || '',
                semester: user.semester?._id || '',
                college: user.college?._id || '',
                department: user.department || ''
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

    const getDepartmentOption = () => {
        if (!formData.department || !department.length) return null;

        const dept = department.find(d => d._id === formData.department);
        if (!dept) return null;

        return {
            value: dept._id,
            label: dept.name
        };
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

                            <CollegeAsyncSelect
                                colleges={colleges}
                                value={formData.college}
                                onChange={(collegeId) =>
                                    setFormData(prev => ({ ...prev, college: collegeId }))
                                }
                            />
                        </div>
                    )}

                    {user.role === 'HOD' && (
                        <div className="form-group">
                            <label>Assigned Department</label>

                            <CollegeAsyncSelect
                                colleges={department}
                                value={selectedDepartmentOption}
                                onChange={(option) => {
                                    setSelectedDepartmentOption(option);
                                    setFormData(prev => ({
                                        ...prev,
                                        department: option?.value || ''
                                    }));
                                }}
                                placeholder="Search Department..."
                            />
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
