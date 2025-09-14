import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from '../admin/EditModal';

// =======================================================
// Reusable Sub-Component for each column in the UI
// =======================================================
const HierarchyColumn = ({
    title,
    items,
    selectedId,
    onSelect,
    onCreate,
    onEdit,
    onDelete,
    placeholder,
    itemType,
    inputType = 'text',
    createDisabled = false
}) => {
    const [newItemValue, setNewItemValue] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newItemValue.trim()) return;
        setLoading(true);
        try {
            await onCreate(newItemValue);
            setNewItemValue(''); // Reset form on success
        } catch (error) {
            console.error(`Failed to create ${itemType}:`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hierarchy-column">
            <h3>{title} ({items.length})</h3>
            <div className="item-list">
                {items.length > 0 ? items.map(item => (
                    <div key={item._id} className={`item-container ${item._id === selectedId ? 'selected' : ''}`}>
                        <button className="item-button" onClick={() => onSelect(item._id)}>
                            {item.name || item.number}
                        </button>
                        <div className="item-actions">
                            <button className="action-btn edit-btn" onClick={() => onEdit(item, itemType)}>Edit</button>
                            <button className="action-btn delete-btn" onClick={() => onDelete(item._id, itemType)}>Del</button>
                        </div>
                    </div>
                )) : <p className="empty-column-message">Select a parent item to view or create new entries.</p>}
            </div>
            {onCreate && (
                <form onSubmit={handleCreate} className="create-form">
                    <input
                        type={inputType}
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        placeholder={placeholder}
                        required
                        disabled={createDisabled}
                    />
                    <button type="submit" className="btn-primary" disabled={loading || createDisabled}>{loading ? '...' : '+'}</button>
                </form>
            )}
        </div>
    );
};

// =======================================================
// The Main Page Component for UA Hierarchy Management
// =======================================================
const UAManageHierarchy = () => {
    // --- State Management ---
    const [degrees, setDegrees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedDegree, setSelectedDegree] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [editingItemType, setEditingItemType] = useState('');

    // --- Data Fetching Logic ---
    const fetchAllDegrees = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/university-affairs/degrees');
            setDegrees(data);
            setError('');
        } catch (e) {
            setError('Failed to load degrees. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllDegrees();
    }, [fetchAllDegrees]);

    // --- Cascading Effects for fetching child data (Corrected Hierarchy) ---
    useEffect(() => {
        setCourses([]); setDepartments([]); setSemesters([]);
        setSelectedCourse(null); setSelectedDepartment(null);
        if (selectedDegree) {
            api.get(`/university-affairs/courses?degree=${selectedDegree}`).then(res => setCourses(res.data));
        }
    }, [selectedDegree]);

    useEffect(() => {
        setDepartments([]); setSemesters([]);
        setSelectedDepartment(null);
        if (selectedCourse) {
            api.get(`/university-affairs/departments?course=${selectedCourse}`).then(res => setDepartments(res.data));
        }
    }, [selectedCourse]);

    useEffect(() => {
        setSemesters([]);
        if (selectedDepartment) {
            api.get(`/university-affairs/semesters?department=${selectedDepartment}`).then(res => setSemesters(res.data));
        }
    }, [selectedDepartment]);


    // --- Universal CRUD Handlers ---
    const handleCreate = useCallback(async (value, type, parentData) => {
        try {
            setError('');
            const payload = (type === 'semesters') ? { number: parseInt(value), ...parentData } : { name: value, ...parentData };
            await api.post(`/university-affairs/${type}`, payload);

            // Smartly refresh only the relevant column's data
            if (type === 'degrees') await fetchAllDegrees();
            if (type === 'courses') api.get(`/university-affairs/courses?degree=${selectedDegree}`).then(res => setCourses(res.data));
            if (type === 'departments') api.get(`/university-affairs/departments?course=${selectedCourse}`).then(res => setDepartments(res.data));
            if (type === 'semesters') api.get(`/university-affairs/semesters?department=${selectedDepartment}`).then(res => setSemesters(res.data));

        } catch (e) { setError(`Failed to create new ${type.slice(0, -1)}. Ensure it is not a duplicate.`); }
    }, [fetchAllDegrees, selectedDegree, selectedCourse, selectedDepartment]);

    const handleDelete = useCallback(async (id, type) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete this ${type.slice(0, -1)}? All children items will be affected.`)) {
            try {
                setError('');
                await api.delete(`/university-affairs/${type}/${id}`);
                await fetchAllDegrees();
                setSelectedDegree(null);
            } catch (e) { setError(`Failed to delete item. It may still be in use.`); }
        }
    }, [fetchAllDegrees]);

    const openEditModal = (item, type) => { setEditingItem(item); setEditingItemType(type); };

    const handleSaveFromModal = async () => {
        await fetchAllDegrees(); // Refresh everything to ensure consistency
        setSelectedDegree(null); // Reset selections
    };

    if (loading) return <div className="container"><h2>Loading Academic Structure...</h2></div>;

    return (
        <div className="container">
            <Link to="/ua/dashboard" className="btn-link">&larr; Back to UA Dashboard</Link>
            <h1>Manage Academic Structure</h1>
            <p>Select an item in a column to view and manage its children. Use the '+' form at the bottom of each column to create new items.</p>
            {error && <p className="error">{error}</p>}

            <div className="hierarchy-container">
                <HierarchyColumn
                    title="Degrees"
                    items={degrees}
                    selectedId={selectedDegree}
                    onSelect={setSelectedDegree}
                    onCreate={(name) => handleCreate(name, 'degrees')}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    itemType="degrees"
                    placeholder="+ New Degree"
                />

                <HierarchyColumn
                    title="Courses"
                    items={courses}
                    selectedId={selectedCourse}
                    onSelect={setSelectedCourse}
                    onCreate={(name) => handleCreate(name, 'courses', { degree: selectedDegree })}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    itemType="courses"
                    placeholder="+ New Course"
                    createDisabled={!selectedDegree}
                />

                <HierarchyColumn
                    title="Departments"
                    items={departments}
                    selectedId={selectedDepartment}
                    onSelect={setSelectedDepartment}
                    onCreate={(name) => handleCreate(name, 'departments', { course: selectedCourse })}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    itemType="departments"
                    placeholder="+ New Department"
                    createDisabled={!selectedCourse}
                />

                <HierarchyColumn
                    title="Semesters"
                    items={semesters}
                    selectedId={null} // Semesters are the last level
                    onSelect={() => { }} // No selection action needed
                    onCreate={(num) => handleCreate(num, 'semesters', { department: selectedDepartment })}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    itemType="semesters"
                    inputType="number"
                    placeholder="+ New Semester (e.g., 5)"
                    createDisabled={!selectedDepartment}
                />
            </div>

            {editingItem && <EditModal item={editingItem} itemType={editingItemType} onClose={() => setEditingItem(null)} onSave={handleSaveFromModal} />}
        </div>
    );
};

export default UAManageHierarchy;