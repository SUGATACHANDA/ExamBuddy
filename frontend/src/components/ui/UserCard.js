// src/components/ui/UserCard.js
import React from 'react';

// A helper function inside the component to determine the subtext.
const getUserSubtext = (user) => {
    // --- THIS IS THE ROBUST LOGIC ---
    // If the user object and its department property exist, and the department has a name...
    if (user?.department?.name) {
        // For Teachers and HODs, show their department.
        return `Department: ${user.department.name}`;
    }
    // If the user is an admin or UA, their college might be populated.
    else if (user?.college?.name) {
        return `College: ${user.college.name}`;
    }
    // As a final fallback, show their role.
    else if (user?.role) {
        // Format the role to be more readable (e.g., 'university_affairs' -> 'University Affairs')
        const formattedRole = user.role.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
        return `Role: ${formattedRole}`;
    }
    // Default fallback if no other info is available.
    return 'User information unavailable';
};

const UserCard = ({ user, onEdit, onDelete }) => {
    // --- Defensively check if the user object even exists ---
    if (!user) {
        return null; // Or render a placeholder/error card
    }

    const subtext = getUserSubtext(user);

    return (
        <div className="user-card">
            <div className="user-card-info">
                <h4>{user.name || 'Unnamed User'}</h4>
                <p>{user.collegeId || 'No ID'} | {user.email || 'No Email'}</p>
                <small>{subtext}</small> {/* Use the safe subtext */}
            </div>
            {/* The actions are only rendered if the onEdit/onDelete functions are provided */}
            {(onEdit && onDelete) && (
                <div className="user-card-actions">
                    <button onClick={() => onEdit(user)} className="action-btn edit-btn">Edit</button>
                    <button onClick={() => onDelete(user._id)} className="action-btn delete-btn">Delete</button>
                </div>
            )}
        </div>
    );
};

export default UserCard;