import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import EditModal from '../admin/EditModal';
import LoadingScreen from 'components/LoadingScreen';

/* =======================================================
   Reusable Sub-Component for each column in the UI
======================================================= */

const VALID_DELETE_TYPES = [
    'degrees',
    'courses',
    'departments',
    'semesters'
];
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
    const safeItems = Array.isArray(items) ? items : [];

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
            <h3>{title} ({safeItems.length})</h3>

            {loading ? (
                <LoadingScreen />
            ) : (
                <div className="item-list">
                    {safeItems.length > 0 ? (
                        safeItems.map(item => {
                            const displayValue =
                                typeof item.name === 'string'
                                    ? item.name
                                    : typeof item.number === 'number'
                                        ? item.number
                                        : String(item.number ?? '');

                            return (
                                <div
                                    key={item._id}
                                    className={`item-container ${item._id === selectedId ? 'selected' : ''
                                        }`}
                                >
                                    <button
                                        className="item-button"
                                        onClick={() => onSelect(item._id)}
                                    >
                                        {displayValue}
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
                            );
                        })
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

/* =======================================================
   Main Page Component
======================================================= */
const UAManageHierarchy = () => {
    const hierarchyRef = useRef(null);
    const currentColumnIndexRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    const getCurrentColumnIndex = () => {
        const container = hierarchyRef.current;
        if (!container) return 0;

        const columns = Array.from(
            container.querySelectorAll('.hierarchy-column')
        );

        const containerLeft = container.getBoundingClientRect().left;

        let closestIndex = 0;
        let closestDistance = Infinity;

        columns.forEach((col, index) => {
            const colLeft = col.getBoundingClientRect().left;
            const distance = Math.abs(colLeft - containerLeft);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    };

    const scrollToColumnIndex = (index) => {
        const container = hierarchyRef.current;
        if (!container) return;

        const columns = container.querySelectorAll('.hierarchy-column');
        if (!columns[index]) return;

        columns[index].scrollIntoView({
            behavior: 'smooth',
            inline: 'start',
            block: 'nearest',
        });
    };

    const scrollHierarchy = (direction) => {
        const container = hierarchyRef.current;
        if (!container) return;

        const columns = container.querySelectorAll('.hierarchy-column');
        if (!columns.length) return;

        const currentIndex = getCurrentColumnIndex();
        const nextIndex = Math.max(
            0,
            Math.min(currentIndex + direction, columns.length - 1)
        );

        scrollToColumnIndex(nextIndex);
    };



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

    useEffect(() => {
        if (!isInitialLoadRef.current) return;

        const container = hierarchyRef.current;
        const firstColumn = container?.querySelector('.hierarchy-column');

        if (firstColumn) {
            firstColumn.scrollIntoView({ behavior: 'auto' });
        }

        currentColumnIndexRef.current = 0;
        isInitialLoadRef.current = false;
    }, []);

    /* ---------- Fetch Degrees ---------- */
    const fetchAllDegrees = useCallback(async () => {
        setLoading(true);
        setLoadingDegrees(true);
        try {
            const { data } = await api.get('/university-affairs/degrees');
            setDegrees(Array.isArray(data) ? data : []);
            setError('');
        } catch {
            setError('Failed to load degrees.');
        } finally {
            setLoading(false);
            setLoadingDegrees(false);
        }
    }, []);

    useEffect(() => {
        fetchAllDegrees();
    }, [fetchAllDegrees]);

    /* ---------- Fetch Courses ---------- */
    useEffect(() => {
        setCourses([]);
        setDepartments([]);
        setSemesters([]);
        setSelectedCourse(null);
        setSelectedDepartment(null);

        if (selectedDegree) {
            setLoadingCourses(true);
            api.get(`/university-affairs/courses?degree=${selectedDegree}`)
                .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
                .finally(() => setLoadingCourses(false));
        }
    }, [selectedDegree]);

    /* ---------- Fetch Departments ---------- */
    useEffect(() => {
        setDepartments([]);
        setSemesters([]);
        setSelectedDepartment(null);

        if (selectedCourse) {
            setLoadingDepartments(true);
            api.get(`/university-affairs/departments?course=${selectedCourse}`)
                .then(res => setDepartments(Array.isArray(res.data) ? res.data : []))
                .finally(() => setLoadingDepartments(false));
        }
    }, [selectedCourse]);

    /* ---------- Fetch Semesters ---------- */
    useEffect(() => {
        setSemesters([]);

        if (selectedDepartment) {
            setLoadingSemesters(true);
            api.get(`/university-affairs/semesters?department=${selectedDepartment}`)
                .then(res => setSemesters(Array.isArray(res.data) ? res.data : []))
                .finally(() => setLoadingSemesters(false));
        }
    }, [selectedDepartment]);

    /* ---------- Create ---------- */
    const handleCreate = useCallback(
        async (value, type, parentData) => {
            try {
                const payload =
                    type === 'semesters'
                        ? { number: Number(value), ...parentData }
                        : { name: value, ...parentData };

                await api.post(`/university-affairs/${type}`, payload);

                if (type === 'degrees') await fetchAllDegrees();
                if (type === 'courses')
                    api.get(`/university-affairs/courses?degree=${selectedDegree}`)
                        .then(res => setCourses(Array.isArray(res.data) ? res.data : []));
                if (type === 'departments')
                    api.get(`/university-affairs/departments?course=${selectedCourse}`)
                        .then(res => setDepartments(Array.isArray(res.data) ? res.data : []));
                if (type === 'semesters')
                    api.get(`/university-affairs/semesters?department=${selectedDepartment}`)
                        .then(res => setSemesters(Array.isArray(res.data) ? res.data : []));
            } catch {
                setError(`Failed to create ${type.slice(0, -1)}.`);
            }
        },
        [fetchAllDegrees, selectedDegree, selectedCourse, selectedDepartment]
    );

    const handleDelete = useCallback(
        async (id, type) => {
            if (!id || typeof type !== 'string') return;

            const label = type.slice(0, -1);
            if (!window.confirm(`Delete this ${label}?`)) return;

            try {
                await api.delete(`/university-affairs/${type}/${id}`);

                // 🔥 Refresh ONLY the relevant level
                if (type === 'degrees') {
                    fetchAllDegrees();
                    setSelectedDegree(null);
                }

                if (type === 'courses') {
                    setCourses(prev => prev.filter(i => i._id !== id));
                    setSelectedCourse(null);
                }

                if (type === 'departments') {
                    setDepartments(prev => prev.filter(i => i._id !== id));
                    setSelectedDepartment(null);
                }

                if (type === 'semesters') {
                    setSemesters(prev => prev.filter(i => i._id !== id));
                }
            } catch {
                setError(`Failed to delete ${label}.`);
            }
        },
        [fetchAllDegrees]
    );

    const handleEditSave = (updatedItem, type) => {
        if (!updatedItem || !type) return;

        const replace = (setter) => {
            setter(prev =>
                Array.isArray(prev)
                    ? prev.map(item =>
                        item._id === updatedItem._id ? updatedItem : item
                    )
                    : prev
            );
        };

        if (type === 'degrees') replace(setDegrees);
        if (type === 'courses') replace(setCourses);
        if (type === 'departments') replace(setDepartments);
        if (type === 'semesters') replace(setSemesters);

        setEditingItem(null);
    };


    return (
        <>
            {loading && <LoadingScreen />}

            <div className="container">
                <Link to="/ua/dashboard" className="btn-link">
                    &larr; Back to UA Dashboard
                </Link>

                <h1>Manage Academic Structure</h1>
                <p>Select an item to manage its children.</p>
                {error && <p className="error">{error}</p>}

                {/* SCROLL BUTTONS */}
                <div className="hierarchy-scroll-controls">
                    <button className="hierarchy-scroll-btn" onClick={() => scrollHierarchy(-1)} title='Go to Previous Section'>◀</button>
                    <button className="hierarchy-scroll-btn" onClick={() => scrollHierarchy(1)} title='Go to Next Section'>▶</button>
                </div>

                <div className="hierarchy-container" ref={hierarchyRef}>
                    <HierarchyColumn
                        title="Degrees"
                        items={degrees}
                        selectedId={selectedDegree}
                        onSelect={(id) => {
                            setSelectedDegree(id);
                            scrollToColumnIndex(1);
                        }}
                        onCreate={(name) => handleCreate(name, 'degrees')}
                        onEdit={(i) => { setEditingItem(i); setEditingItemType('degrees'); }}
                        onDelete={handleDelete}
                        placeholder="+ New Degree"
                        loading={loadingDegrees}
                        itemType="degrees"
                    />

                    <HierarchyColumn
                        title="Courses"
                        items={courses}
                        selectedId={selectedCourse}
                        onSelect={(id) => {
                            setSelectedCourse(id);
                            scrollToColumnIndex(2);
                        }}
                        onCreate={(name) => handleCreate(name, 'courses', { degree: selectedDegree })}
                        onEdit={(i) => { setEditingItem(i); setEditingItemType('courses'); }}
                        onDelete={handleDelete}
                        placeholder="+ New Course"
                        createDisabled={!selectedDegree}
                        loading={loadingCourses}
                        itemType=""
                    />

                    <HierarchyColumn
                        title="Departments"
                        items={departments}
                        selectedId={selectedDepartment}
                        onSelect={(id) => {
                            setSelectedDepartment(id);
                            scrollToColumnIndex(3);
                        }}
                        onCreate={(name) => handleCreate(name, 'departments', { course: selectedCourse })}
                        onEdit={(i) => { setEditingItem(i); setEditingItemType('departments'); }}
                        onDelete={handleDelete}
                        placeholder="+ New Department"
                        createDisabled={!selectedCourse}
                        loading={loadingDepartments}
                        itemType="departments"
                    />

                    <HierarchyColumn
                        title="Semesters"
                        items={semesters}
                        onSelect={() => { }}
                        onCreate={(num) => handleCreate(num, 'semesters', { department: selectedDepartment })}
                        onEdit={(i) => { setEditingItem(i); setEditingItemType('semesters'); }}
                        onDelete={handleDelete}
                        inputType="number"
                        placeholder="+ New Semester"
                        createDisabled={!selectedDepartment}
                        loading={loadingSemesters}
                        itemType="semesters"
                    />
                </div>

                {editingItem && (
                    <EditModal
                        item={editingItem}
                        itemType={editingItemType}
                        onClose={() => setEditingItem(null)}
                        onSave={handleEditSave}
                    />
                )}
            </div>
        </>
    );
};

export default UAManageHierarchy;
