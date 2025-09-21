import React, { useState } from 'react';
import api from '../../api/axiosConfig';

const ChangePasswordModal = ({ onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return setError("New passwords do not match.");
        setError(''); setSuccess(''); setLoading(true);
        try {
            await api.put('/auth/change-password', { oldPassword, newPassword });
            setSuccess('Password updated successfully! You can now close this window.');
            // Optionally auto-close after a delay
            setTimeout(onClose, 2000);
        } catch (err) { setError(err.response?.data?.message || 'Failed to change password.'); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Change Password</h2>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label>Current Password</label><input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required /></div>
                        <div className="form-group"><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
                        <div className="form-group"><label>Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
                        <div className="modal-actions">
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
export default ChangePasswordModal;