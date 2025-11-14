import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import UserCard from '../../components/ui/UserCard';
import Pagination from '../../components/teacher/Pagination';
import EditUserModal from './EditUserModal';
import { togglePasswordVisibility } from 'utils/passwordToggle';
import { Eye, EyeOff } from 'lucide-react';

// A dedicated modal sub-component for CREATING a new University Affairs user.
const CreateUAModal = ({ colleges, onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', email: '', collegeId: '', password: 'password123', college: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/admin/users/register-ua', formData);
            onSave(); // This tells the parent component to refresh its data
            onClose(); // This closes the modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register this user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Register New University Affairs Staff</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Full Name</label><input name="name" value={formData.name} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Email Address</label><input name="email" type="email" value={formData.email} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Employee ID</label><input name="collegeId" value={formData.collegeId} onChange={handleChange} required /></div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label>Create Password</label>
                        <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password || ''}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                            style={{ paddingRight: '2.5rem' }}
                            disabled
                        />

                        {showPassword ? (
                            <EyeOff
                                className="password-icon"
                                onClick={() => {
                                    togglePasswordVisibility('password');
                                    setShowPassword(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '65%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                }}

                            />
                        ) : (
                            <Eye
                                className="password-icon"
                                onClick={() => {
                                    togglePasswordVisibility('password');
                                    setShowPassword(true);
                                }}
                                xlinkTitle='Show Password'
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '65%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                }}
                            />
                        )}
                    </div>
                    <div className="form-group"><label>Assign to College</label>
                        <select name="college" value={formData.college} onChange={handleChange} required>
                            <option value="" disabled>-- Select a College --</option>
                            {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Registering...' : 'Register Staff Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// The main page component for managing University Affairs staff.
const AdminManageUA = () => {
    const [uaUsers, setUaUsers] = useState([]);
    const [colleges, setColleges] = useState([]); // Needed for the registration form dropdown
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 6;

    // Data fetching logic
    const fetchData = useCallback(async () => {
        // Set loading only for the list, not the whole page if modals are open
        if (!isCreateModalOpen && !isEditModalOpen) {
            setLoading(true);
        }
        try {
            const [uaRes, collegesRes] = await Promise.all([
                // The backend must support fetching users by this specific role
                api.get('/admin/users/university_affairs'),
                api.get('/admin/colleges')
            ]);
            setUaUsers(uaRes.data);
            setColleges(collegesRes.data);
            setError('');
        } catch (e) {
            setError('Failed to load University Affairs data.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [isCreateModalOpen, isEditModalOpen]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Memoized data for pagination
    const paginatedUaUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * usersPerPage;
        return uaUsers.slice(startIndex, startIndex + usersPerPage);
    }, [uaUsers, currentPage]);
    const totalPages = Math.ceil(uaUsers.length / usersPerPage);

    // CRUD Handlers
    const openEditModal = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this University Affairs user?')) {
            try {
                await api.delete(`/admin/users/${id}`);
                await fetchData(); // Refresh list after deleting
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete user.");
            }
        }
    };

    return (
        <div className="container">
            <Link to="/admin/dashboard" className="btn-link">&larr; Back to Admin Dashboard</Link>
            <div className="page-header">
                <div>
                    <h1>Manage University Affairs Staff</h1>
                    <p>Register new UA staff and assign them to a college. These users will manage academic structures.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                    + Register UA Staff
                </button>
            </div>
            {error && <p className="error">{error}</p>}

            <div className="content-area">
                {loading ? <p>Loading users...</p> : uaUsers.length > 0 ? (
                    <>
                        <div className="user-grid">
                            {paginatedUaUsers.map(user => (
                                <UserCard
                                    key={user._id}
                                    user={user}
                                    onEdit={openEditModal}
                                    onDelete={handleDeleteUser}
                                />
                            ))}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                ) : (
                    <p>No University Affairs staff have been registered yet. Click the button above to add one.</p>
                )}
            </div>

            {/* Render Modals */}
            {isCreateModalOpen &&
                <CreateUAModal colleges={colleges} onClose={() => setIsCreateModalOpen(false)} onSave={fetchData} />
            }

            {isEditModalOpen &&
                <EditUserModal user={editingUser} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} />
            }
        </div>
    );
};

export default AdminManageUA;