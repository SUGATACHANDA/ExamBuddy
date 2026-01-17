import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from './EditModal'; // Reusing the modal for editing name/location
import Pagination from '../../components/teacher/Pagination';

const AdminManageColleges = () => {
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 6;

    // --- Data Fetching ---
    const fetchColleges = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/colleges');
            setColleges(data);
            setCurrentPage(1);
            setError('');
        } catch (err) { setError('Failed to fetch colleges.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchColleges();
    }, [fetchColleges]);

    const paginatedColleges = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return colleges.slice(startIndex, startIndex + itemsPerPage);
    }, [colleges, currentPage]);

    const totalPages = Math.ceil(colleges.length / itemsPerPage);

    // --- CRUD Handlers ---
    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete the college "${name}"? This will affect all associated degrees, courses, and users.`)) {
            try {
                await api.delete(`/admin/colleges/${id}`);
                await fetchColleges();
            } catch (e) { setError('Failed to delete college. It may be in use.'); }
        }
    };
    const openEditModal = (college) => {
        setEditingItem(college);
        setIsEditModalOpen(true);
    };

    return (
        <div className="container">
            <Link to="/admin/dashboard" className="btn-link">&larr; Back to Admin Dashboard</Link>
            <div className="page-header">
                <div>
                    <h1>Manage Colleges</h1>
                    <p>Create or manage university institutions.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">+ Create New College</button>
            </div>
            {error && <p className="error">{error}</p>}

            <div className="item-grid">
                {loading ? <p>Loading...</p> : paginatedColleges.map(college => (
                    <div key={college._id} className="item-card">
                        <div className="item-card-info">
                            <h4>{college.name}</h4>
                            <p>{college.location}</p>
                        </div>
                        <div className="item-card-actions">
                            <button onClick={() => openEditModal(college)} className="action-btn edit-btn">Edit</button>
                            <button onClick={() => handleDelete(college._id, college.name)} className="action-btn delete-btn">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {isCreateModalOpen && <CreateCollegeModal onClose={() => setIsCreateModalOpen(false)} onSave={fetchColleges} />}
            {isEditModalOpen && <EditModal item={editingItem} itemType="colleges" onClose={() => setIsEditModalOpen(false)} onSave={fetchColleges} />}
        </div>
    );
};

// Simple sub-component for the create modal
const CreateCollegeModal = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true);
        await api.post('/admin/colleges', { name, location });
        onSave(); setLoading(false); onClose();
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create New College</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>College Name</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
                    <div className="form-group"><label>Location</label><input value={location} onChange={e => setLocation(e.target.value)} required /></div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create College'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminManageColleges;