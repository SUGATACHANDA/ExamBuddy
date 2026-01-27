// src/screens/admin/EditModal.js
import { React, useState, useEffect } from 'react';
import api from '../../api/axiosConfig';

const EditModal = ({ item, itemType, onClose, onSave }) => {
    // Local state for the input field.
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // When the `item` prop changes, update our local state.
    // This runs when the modal is first opened.
    useEffect(() => {
        if (item) {
            // Handles both items with 'name' and semesters with 'number'.
            setInputValue(item.name || item.number || '');
        }
    }, [item]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Determine the payload key based on the item type.
            const payload = item.number !== undefined ? { number: inputValue } : { name: inputValue };

            // Call the API to update the document.
            const { data: updatedItem } = await api.put(
                `/university-affairs/${itemType}/${item._id}`,
                payload
            );

            // On success, call the onSave function passed from the parent.
            // THIS is what tells the parent to refresh its data.
            onSave(updatedItem, itemType);
            onClose(); // Then close the modal.
        } catch (error) {
            console.error(`Failed to update ${itemType}`, error);
            setError('Update failed. The name may already exist.');
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {/* Capitalize the first letter of the item type for the title */}
                <h2>Edit {itemType.charAt(0).toUpperCase() + itemType.slice(1, -1)}</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleUpdate}>
                    <div className="form-group">
                        <label>{item.number !== undefined ? 'Semester Number' : 'Name'}</label>
                        <input
                            // Input type is number if the item has a 'number' property
                            type={item.number !== undefined ? "number" : "text"}
                            value={inputValue}
                            // The `onChange` updates the LOCAL inputValue state, allowing you to type.
                            onChange={(e) => setInputValue(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditModal;