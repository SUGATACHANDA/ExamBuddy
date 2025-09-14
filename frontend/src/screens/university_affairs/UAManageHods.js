import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';

// Import reusable components
import EditUserModal from '../admin/EditUserModal';
import UserCard from '../../components/ui/UserCard';
import Pagination from '../../components/teacher/Pagination';

// A dedicated modal for CREATING a new HOD
const CreateHODModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({ name: '', email: '', collegeId: '', password: '', department: '' });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch available departments when the modal mounts
    useEffect(() => {
        api.get('/university-affairs/departments')
            .then(res => setDepartments(res.data))
            .catch(() => setError('Could not load departments.'));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/university-affairs/users/register-hod', formData);
            onSave(); // Tell the parent to refresh its list
            onClose(); // Close the modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register HOD.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Register New Head of Department</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit} className="register-user-form">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" value={formData.name || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input name="email" type="email" value={formData.email || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Employee ID</label>
                        <input name="collegeId" value={formData.collegeId || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Create Password</label>
                        <input name="password" type="password" value={formData.password || ''} onChange={handleChange} required autoComplete="new-password" />
                    </div>
                    <div className="form-group">
                        <label>Assign to Department</label>
                        <select name="department" value={formData.department || ''} onChange={handleChange} required disabled={departments.length === 0}>
                            <option value="" disabled>-- Select a Department --</option>
                            {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Registering...' : 'Register HOD'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- The Main Page Component ---
const UAManageHods = () => {
    // --- State Management ---
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // State for Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 6;

    // --- Data Fetching ---
    const fetchHODs = useCallback(async () => {
        try {
            setLoading(true);
            // This API call is scoped to the UA's college by the backend.
            const { data } = await api.get('/university-affairs/users/hods');
            setHods(data);
            setError('');
        } catch (err) {
            setError('Failed to load HODs.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHODs();
    }, [fetchHODs]);


    // --- Memoized Pagination Data ---
    const paginatedHods = useMemo(() => {
        const startIndex = (currentPage - 1) * usersPerPage;
        return hods.slice(startIndex, startIndex + usersPerPage);
    }, [hods, currentPage]);

    const totalPages = Math.ceil(hods.length / usersPerPage);


    // --- CRUD Handlers ---
    const openEditModal = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this HOD?')) {
            try {
                // HOD is a type of user, so the delete endpoint is the generic admin one.
                // You could also create a specific UA one for this.
                await api.delete(`/university-affairs/users/hod/${id}`);
                await fetchHODs(); // Refresh list after deleting
            } catch (err) {
                setError(err.response?.data?.message || "Failed to delete user.");
            }
        }
    };


    return (
        <div className="container">
            <Link to="/ua/dashboard" className="btn-link">&larr; Back to UA Dashboard</Link>

            <div className="page-header">
                <div>
                    <h1>Manage Heads of Department</h1>
                    <p>Register new HODs for departments within your college.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
                    + Register New HOD
                </button>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="content-area">
                {loading ? <p>Loading HOD list...</p> : hods.length > 0 ? (
                    <>
                        <div className="user-grid">
                            {paginatedHods.map(hod => (
                                <UserCard
                                    key={hod._id}
                                    user={hod}
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
                    <p>No Heads of Department have been registered for your college yet.</p>
                )}
            </div>

            {/* Render Modals */}
            {isCreateModalOpen && (
                <CreateHODModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={fetchHODs}
                />
            )}

            {isEditModalOpen && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={fetchHODs}
                    // --- THIS IS THE CRITICAL FIX ---
                    // A UA staff member must use their own authorized endpoint to update an HOD.
                    updateUrl={`/university-affairs/users/hods/${editingUser._id}`}
                />
            )}
        </div>
    );
};

export default UAManageHods;