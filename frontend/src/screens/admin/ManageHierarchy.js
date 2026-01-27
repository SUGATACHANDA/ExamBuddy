import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from './EditModal';

// =======================================================
// Reusable Sub-Component for each column
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
    inputType = 'text'
}) => {
    const [newItemValue, setNewItemValue] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newItemValue.trim()) return;
        setLoading(true);
        try {
            await onCreate(newItemValue);
            setNewItemValue('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hierarchy-column">
            <h3>{title}</h3>

            <div className="item-list">
                {items.length > 0 ? (
                    items.map(item => (
                        <div
                            key={item._id}
                            className={`item-container ${item._id === selectedId ? 'selected' : ''
                                }`}
                        >
                            <button
                                className="item-button"
                                onClick={() => onSelect?.(item._id)}
                            >
                                {item.name || item.number}
                            </button>

                            <div className="item-actions">
                                <button
                                    className="action-btn edit-btn"
                                    onClick={() => onEdit(item, itemType)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => onDelete(item._id, itemType)}
                                >
                                    Del
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="empty-column-message">No items yet.</p>
                )}
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
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? '...' : '+'}
                    </button>
                </form>
            )}
        </div>
    );
};

// =======================================================
// Main Page Component
// =======================================================
const ManageHierarchy = () => {
    const [colleges, setColleges] = useState([]);
    const [degrees, setDegrees] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);

    const [selectedCollege, setSelectedCollege] = useState(null);
    const [selectedDegree, setSelectedDegree] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingItem, setEditingItem] = useState(null);
    const [editingItemType, setEditingItemType] = useState('');

    const hierarchyRef = useRef(null);

    const scrollHierarchy = (direction) => {
        if (!hierarchyRef.current) return;

        hierarchyRef.current.scrollBy({
            left: direction * 270,
            behavior: 'smooth',
        });
    };

    // ------------------ DATA FETCHING ------------------
    const fetchColleges = useCallback(async () => {
        try {
            const { data } = await api.get('/admin/colleges');
            setColleges(data);
        } catch {
            setError('Failed to fetch colleges.');
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchColleges();
            setLoading(false);
        })();
    }, [fetchColleges]);

    useEffect(() => {
        setDegrees([]);
        setCourses([]);
        setDepartments([]);
        setSemesters([]);
        setSelectedDegree(null);
        setSelectedCourse(null);
        setSelectedDepartment(null);

        if (selectedCollege) {
            api.get(`/admin/degrees?college=${selectedCollege}`)
                .then(res => setDegrees(res.data));
        }
    }, [selectedCollege]);

    useEffect(() => {
        setCourses([]);
        setDepartments([]);
        setSemesters([]);
        setSelectedCourse(null);
        setSelectedDepartment(null);

        if (selectedDegree) {
            api.get(`/admin/courses?degree=${selectedDegree}`)
                .then(res => setCourses(res.data));
        }
    }, [selectedDegree]);

    useEffect(() => {
        setDepartments([]);
        setSemesters([]);
        setSelectedDepartment(null);

        if (selectedCourse) {
            api.get(`/admin/departments?course=${selectedCourse}`)
                .then(res => setDepartments(res.data));
        }
    }, [selectedCourse]);

    useEffect(() => {
        setSemesters([]);

        if (selectedDepartment) {
            api.get(`/admin/semesters?department=${selectedDepartment}`)
                .then(res => setSemesters(res.data));
        }
    }, [selectedDepartment]);

    // ------------------ CREATE / DELETE ------------------
    const handleCreate = useCallback(
        async (value, type, parentData = {}) => {
            const payload =
                type === 'semesters'
                    ? { number: parseInt(value, 10), ...parentData }
                    : { name: value, ...parentData };

            await api.post(`/admin/${type}`, payload);
            await fetchColleges();
        },
        [fetchColleges]
    );

    const handleDelete = useCallback(
        async (id, type) => {
            if (!window.confirm(`Delete this ${type.slice(0, -1)}?`)) return;
            await api.delete(`/admin/${type}/${id}`);
            await fetchColleges();
            setSelectedCollege(null);
        },
        [fetchColleges]
    );

    const handleEdit = (item, type) => {
        setEditingItem(item);
        setEditingItemType(type);
    };

    const handleSave = async () => {
        await fetchColleges();
        setEditingItem(null);
        setSelectedCollege(null);
    };

    if (loading) {
        return <div className="container">Loading hierarchy data…</div>;
    }

    return (
        <div className="container">
            <Link to="/admin/dashboard" className="btn-link">
                ← Back to Admin Panel
            </Link>

            <h1>Manage Academic Structure</h1>
            <p>Select an item to manage its children.</p>

            {error && <p className="error">{error}</p>}

            {/* 🔴 SCROLL WRAPPER (THIS WAS MISSING IN DOM BEFORE) */}
            <div className="hierarchy-scroll-wrapper">
                <button
                    className="hierarchy-arrow left"
                    onClick={() => scrollHierarchy(-1)}
                    type="button"
                >
                    ◀
                </button>

                <div className="hierarchy-container" ref={hierarchyRef}>
                    <HierarchyColumn
                        title="Colleges"
                        items={colleges}
                        selectedId={selectedCollege}
                        onSelect={setSelectedCollege}
                        onCreate={(name) => handleCreate(name, 'colleges')}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        itemType="colleges"
                        placeholder="+ New College"
                    />

                    {selectedCollege && (
                        <HierarchyColumn
                            title="Degrees"
                            items={degrees}
                            selectedId={selectedDegree}
                            onSelect={setSelectedDegree}
                            onCreate={(name) =>
                                handleCreate(name, 'degrees', { college: selectedCollege })
                            }
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            itemType="degrees"
                            placeholder="+ New Degree"
                        />
                    )}

                    {selectedDegree && (
                        <HierarchyColumn
                            title="Courses"
                            items={courses}
                            selectedId={selectedCourse}
                            onSelect={setSelectedCourse}
                            onCreate={(name) =>
                                handleCreate(name, 'courses', { degree: selectedDegree })
                            }
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            itemType="courses"
                            placeholder="+ New Course"
                        />
                    )}

                    {selectedCourse && (
                        <HierarchyColumn
                            title="Departments"
                            items={departments}
                            selectedId={selectedDepartment}
                            onSelect={setSelectedDepartment}
                            onCreate={(name) =>
                                handleCreate(name, 'departments', { course: selectedCourse })
                            }
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            itemType="departments"
                            placeholder="+ New Department"
                        />
                    )}

                    {selectedDepartment && (
                        <HierarchyColumn
                            title="Semesters"
                            items={semesters}
                            onSelect={() => { }}
                            onCreate={(num) =>
                                handleCreate(num, 'semesters', { department: selectedDepartment })
                            }
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            itemType="semesters"
                            inputType="number"
                            placeholder="+ New Semester"
                        />
                    )}
                </div>

                <button
                    className="hierarchy-arrow right"
                    onClick={() => scrollHierarchy(1)}
                    type="button"
                >
                    ▶
                </button>
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
