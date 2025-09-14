import { React, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from './EditModal'; // Assuming EditModal.js exists as defined previously

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
    itemType, // e.g., 'colleges', 'degrees'
    inputType = 'text' // default to text, can be 'number' for semesters
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
            <h3>{title}</h3>
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
                )) : <p className="empty-column-message">No items yet.</p>}
            </div>
            {onCreate && (
                <form onSubmit={handleCreate} className="create-form">
                    <input
                        type={inputType}
                        value={newItemValue}
                        onChange={(e) => setNewItemValue(e.target.value)}
                        placeholder={placeholder}
                        required
                        {...(inputType === 'number' && { min: 1, max: 8 })}
                    />
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? '...' : '+'}</button>
                </form>
            )}
        </div>
    );
};


// =======================================================
// The Main Page Component
// =======================================================
const ManageHierarchy = () => {
    // --- State Management for Data Fetched from API ---
    const [colleges, setColleges] = useState([]);
    const [degrees, setDegrees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);

    // --- State Management for User Selections ---
    const [selectedCollege, setSelectedCollege] = useState(null);
    const [selectedDegree, setSelectedDegree] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    // General state for loading feedback and error messages
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the universal Edit Modal
    const [editingItem, setEditingItem] = useState(null);
    const [editingItemType, setEditingItemType] = useState('');

    // --- Data Fetching Logic ---
    const fetchColleges = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/colleges');
            setColleges(data);
        } catch (e) { setError('Failed to fetch colleges.'); }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await fetchColleges();
            setLoading(false);
        };
        loadInitialData();
    }, [fetchColleges]);

    // --- Cascading Effects for fetching child data upon selection ---
    useEffect(() => {
        setDegrees([]); setCourses([]); setDepartments([]); setSemesters([]);
        setSelectedDegree(null); setSelectedCourse(null); setSelectedDepartment(null);
        if (selectedCollege) {
            api.get(`/admin/degrees?college=${selectedCollege}`).then(res => setDegrees(res.data));
        }
    }, [selectedCollege]);

    useEffect(() => {
        setCourses([]); setDepartments([]); setSemesters([]);
        setSelectedCourse(null); setSelectedDepartment(null);
        if (selectedDegree) {
            api.get(`/admin/courses?degree=${selectedDegree}`).then(res => setCourses(res.data));
        }
    }, [selectedDegree]);

    useEffect(() => {
        setDepartments([]); setSemesters([]);
        setSelectedDepartment(null);
        if (selectedCourse) {
            api.get(`/admin/departments?course=${selectedCourse}`).then(res => setDepartments(res.data));
        }
    }, [selectedCourse]);

    useEffect(() => {
        setSemesters([]);
        if (selectedDepartment) {
            api.get(`/admin/semesters?department=${selectedDepartment}`).then(res => setSemesters(res.data));
        }
    }, [selectedDepartment]);


    // --- Universal "Create" Handler ---
    const handleCreate = useCallback(async (value, type, parentData) => {
        try {
            const payload = (type === 'semesters') ? { number: parseInt(value), ...parentData } : { name: value, ...parentData };
            await api.post(`/admin/${type}`, payload);

            // Refresh the specific column that was just updated
            if (type === 'colleges') { await fetchColleges(); }
            if (type === 'degrees') { api.get(`/admin/degrees?college=${selectedCollege}`).then(res => setDegrees(res.data)); }
            if (type === 'courses') { api.get(`/admin/courses?degree=${selectedDegree}`).then(res => setCourses(res.data)); }
            if (type === 'departments') { api.get(`/admin/departments?course=${selectedCourse}`).then(res => setDepartments(res.data)); }
            if (type === 'semesters') { api.get(`/admin/semesters?department=${selectedDepartment}`).then(res => setSemesters(res.data)); }

        } catch (e) { setError(`Failed to create new ${type.slice(0, -1)}. Ensure it's not a duplicate.`); }
    }, [fetchColleges, selectedCollege, selectedDegree, selectedCourse, selectedDepartment]);

    // --- Universal "Delete" Handler ---
    const handleDelete = useCallback(async (id, type) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete this ${type.slice(0, -1)}? This could affect all children items and users associated with it.`)) {
            try {
                await api.delete(`/admin/${type}/${id}`);
                // Refresh everything from the top down after a delete for safety
                await fetchColleges();
                setSelectedCollege(null);
            } catch (e) { setError(`Failed to delete item. It may be in use.`); }
        }
    }, [fetchColleges]);

    const handleEdit = (item, type) => {
        setEditingItem(item);
        setEditingItemType(type);
    };

    const handleSave = async () => {
        await fetchColleges(); // Easiest to just refresh all data
        setSelectedCollege(null); // Reset selection to force user to re-select and see changes
    };

    if (loading) return <div className="container"><p>Loading hierarchy data...</p></div>;

    return (
        <div className="container">
            <Link to="/admin/dashboard" className="btn-link">&larr; Back to Admin Panel</Link>
            <h1>Manage Academic Structure</h1>
            <p>Select an item to view its children. Use the '+' form to add new items. Hover over an item to see Edit/Delete options.</p>
            {error && <p className="error">{error}</p>}

            <div className="hierarchy-container">
                <HierarchyColumn
                    title="Colleges" items={colleges} selectedId={selectedCollege} onSelect={setSelectedCollege}
                    onCreate={(name) => handleCreate(name, 'colleges')}
                    onEdit={handleEdit} onDelete={handleDelete} itemType="colleges" placeholder="+ New College"
                />
                {selectedCollege && (
                    <HierarchyColumn
                        title="Degrees" items={degrees} selectedId={selectedDegree} onSelect={setSelectedDegree}
                        onCreate={(name) => handleCreate(name, 'degrees', { college: selectedCollege })}
                        onEdit={handleEdit} onDelete={handleDelete} itemType="degrees" placeholder="+ New Degree"
                    />
                )}
                {selectedDegree && (
                    <HierarchyColumn
                        title="Courses" items={courses} selectedId={selectedCourse} onSelect={setSelectedCourse}
                        onCreate={(name) => handleCreate(name, 'courses', { degree: selectedDegree })}
                        onEdit={handleEdit} onDelete={handleDelete} itemType="courses" placeholder="+ New Course"
                    />
                )}
                {selectedCourse && (
                    <HierarchyColumn
                        title="Departments" items={departments} selectedId={selectedDepartment} onSelect={setSelectedDepartment}
                        onCreate={(name) => handleCreate(name, 'departments', { course: selectedCourse })}
                        onEdit={handleEdit} onDelete={handleDelete} itemType="departments" placeholder="+ New Department"
                    />
                )}
                {selectedDepartment && (
                    <HierarchyColumn
                        title="Semesters" items={semesters} onSelect={() => { }} // Semesters are the final level, no selection action
                        onCreate={(num) => handleCreate(num, 'semesters', { department: selectedDepartment })}
                        onEdit={handleEdit} onDelete={handleDelete} itemType="semesters" inputType="number" placeholder="+ New Semester (e.g., 5)"
                    />
                )}
            </div>

            {editingItem && (
                <EditModal
                    item={editingItem}
                    itemType={editingItemType}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default ManageHierarchy;