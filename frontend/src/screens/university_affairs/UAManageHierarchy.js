import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from '../admin/EditModal';
import LoadingScreen from 'components/LoadingScreen';

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
    createDisabled = false,
    loading
}) => {
    const [newItemValue, setNewItemValue] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newItemValue.trim()) return;
        setIsCreating(true);
        try {
            await onCreate(newItemValue);
            setNewItemValue('');
        } catch (error) {
            console.error(`Failed to create ${itemType}:`, error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="hierarchy-column">
            <h3>{title} ({items.length})</h3>

            {loading ? (
                <LoadingScreen />
            ) : (
                <div className="item-list">
                    {items.length > 0 ? (
                        items.map(item => (
                            <div
                                key={item._id}
                                className={`item-container ${item._id === selectedId ? 'selected' : ''}`}
                            >
                                <button
                                    className="item-button"
                                    onClick={() => onSelect(item._id)}
                                >
                                    {item.name || item.number}
                                </button>
                                <div className="item-actions">
                                    <button className="action-btn edit-btn" onClick={() => onEdit(item, itemType)}>
                                        Edit
                                    </button>
                                    <button className="action-btn delete-btn" onClick={() => onDelete(item._id, itemType)}>
                                        Del
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-column-message">
                            Select a parent item to view or create new entries.
                        </p>
                    )}
                </div>
            )}

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
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isCreating || createDisabled}
                    >
                        {isCreating ? '...' : '+'}
                    </button>
                </form>
            )}
        </div>
    );
};

// =======================================================
// The Main Page Component for UA Hierarchy Management
// =======================================================
const UAManageHierarchy = () => {
    const [degrees, setDegrees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);

    const [selectedDegree, setSelectedDegree] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [loading, setLoading] = useState(true);
    const [loadingDegrees, setLoadingDegrees] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingSemesters, setLoadingSemesters] = useState(false);

    const [error, setError] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [editingItemType, setEditingItemType] = useState('');

    // --- Fetch Degrees ---
    const fetchAllDegrees = useCallback(async () => {
        setLoading(true);
        setLoadingDegrees(true);
        try {
            const { data } = await api.get('/university-affairs/degrees');
            setDegrees(data);
            setError('');
        } catch (e) {
            setError('Failed to load degrees. Please try again.');
        } finally {
            setLoading(false);
            setLoadingDegrees(false);
        }
    }, []);

    useEffect(() => {
        fetchAllDegrees();
    }, [fetchAllDegrees]);

    // --- Fetch Courses ---
    useEffect(() => {
        setCourses([]);
        setDepartments([]);
        setSemesters([]);
        setSelectedCourse(null);
        setSelectedDepartment(null);

        if (selectedDegree) {
            setLoadingCourses(true);
            api.get(`/university-affairs/courses?degree=${selectedDegree}`)
                .then(res => setCourses(res.data))
                .catch(() => setError('Failed to load courses.'))
                .finally(() => setLoadingCourses(false));
        }
    }, [selectedDegree]);

    // --- Fetch Departments ---
    useEffect(() => {
        setDepartments([]);
        setSemesters([]);
        setSelectedDepartment(null);

        if (selectedCourse) {
            setLoadingDepartments(true);
            api.get(`/university-affairs/departments?course=${selectedCourse}`)
                .then(res => setDepartments(res.data))
                .catch(() => setError('Failed to load departments.'))
                .finally(() => setLoadingDepartments(false));
        }
    }, [selectedCourse]);

    // --- Fetch Semesters ---
    useEffect(() => {
        setSemesters([]);

        if (selectedDepartment) {
            setLoadingSemesters(true);
            api.get(`/university-affairs/semesters?department=${selectedDepartment}`)
                .then(res => setSemesters(res.data))
                .catch(() => setError('Failed to load semesters.'))
                .finally(() => setLoadingSemesters(false));
        }
    }, [selectedDepartment]);

    // --- Universal CRUD Handlers ---
    const handleCreate = useCallback(async (value, type, parentData) => {
        try {
            setError('');
            const payload =
                type === 'semesters'
                    ? { number: parseInt(value), ...parentData }
                    : { name: value, ...parentData };
            await api.post(`/university-affairs/${type}`, payload);

            if (type === 'degrees') await fetchAllDegrees();
            if (type === 'courses')
                api.get(`/university-affairs/courses?degree=${selectedDegree}`).then(res => setCourses(res.data));
            if (type === 'departments')
                api.get(`/university-affairs/departments?course=${selectedCourse}`).then(res => setDepartments(res.data));
            if (type === 'semesters')
                api.get(`/university-affairs/semesters?department=${selectedDepartment}`).then(res => setSemesters(res.data));
        } catch {
            setError(`Failed to create new ${type.slice(0, -1)}.`);
        }
    }, [fetchAllDegrees, selectedDegree, selectedCourse, selectedDepartment]);

    const handleDelete = useCallback(async (id, type) => {
        if (window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
            try {
                setError('');
                await api.delete(`/university-affairs/${type}/${id}`);
                await fetchAllDegrees();
                setSelectedDegree(null);
            } catch {
                setError(`Failed to delete item. It may still be in use.`);
            }
        }
    }, [fetchAllDegrees]);

    const openEditModal = (item, type) => {
        setEditingItem(item);
        setEditingItemType(type);
    };

    const handleSaveFromModal = async () => {
        await fetchAllDegrees();
        setSelectedDegree(null);
    };

    return (
        <>
            {loading && <LoadingScreen />}
            <div className="container">
                <Link to="/ua/dashboard" className="btn-link">&larr; Back to UA Dashboard</Link>
                <h1>Manage Academic Structure</h1>
                <p>Select an item to manage its children. Use the '+' form to add new entries.</p>
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
                        loading={loadingDegrees}
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
                        loading={loadingCourses}
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
                        loading={loadingDepartments}
                    />

                    <HierarchyColumn
                        title="Semesters"
                        items={semesters}
                        selectedId={null}
                        onSelect={() => { }}
                        onCreate={(num) => handleCreate(num, 'semesters', { department: selectedDepartment })}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        itemType="semesters"
                        inputType="number"
                        placeholder="+ New Semester (e.g., 5)"
                        createDisabled={!selectedDepartment}
                        loading={loadingSemesters}
                    />
                </div>

                {editingItem && (
                    <EditModal
                        item={editingItem}
                        itemType={editingItemType}
                        onClose={() => setEditingItem(null)}
                        onSave={handleSaveFromModal}
                    />
                )}
            </div>
        </>
    );
};

export default UAManageHierarchy;
