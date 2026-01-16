// // src/components/ui/UserCard.js
// import React from 'react';

// // A helper function inside the component to determine the subtext.
// const getUserSubtext = (user) => {
//     // --- THIS IS THE ROBUST LOGIC ---
//     // If the user object and its department property exist, and the department has a name...
//     if (user?.department?.name) {
//         // For Teachers and HODs, show their department.
//         return `Department: ${user.department.name}`;
//     }
//     // If the user is an admin or UA, their college might be populated.
//     else if (user?.college?.name) {
//         return `College: ${user.college.name}`;
//     }
//     // As a final fallback, show their role.
//     else if (user?.role) {
//         // Format the role to be more readable (e.g., 'university_affairs' -> 'University Affairs')
//         const formattedRole = user.role.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
//         return `Role: ${formattedRole}`;
//     }
//     // Default fallback if no other info is available.
//     return 'User information unavailable';
// };

// const UserCard = ({ user, onEdit, onDelete }) => {
//     // --- Defensively check if the user object even exists ---
//     if (!user) {
//         return null; // Or render a placeholder/error card
//     }

//     const subtext = getUserSubtext(user);

//     return (
//         <div className="user-card">
//             <div className="user-card-info">
//                 <h4>{user.name || 'Unnamed User'}</h4>
//                 <p>{user.collegeId || 'No ID'} | {user.email || 'No Email'}</p>
//                 <small>{subtext}</small> {/* Use the safe subtext */}
//             </div>
//             {/* The actions are only rendered if the onEdit/onDelete functions are provided */}
//             {(onEdit && onDelete) && (
//                 <div className="user-card-actions">
//                     <button onClick={() => onEdit(user)} className="action-btn edit-btn">Edit</button>
//                     <button onClick={() => onDelete(user._id)} className="action-btn delete-btn">Delete</button>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default UserCard;


// src/components/ui/UserCard.js
// src/components/ui/UserCard.js
import React from 'react';
import './UserCard.css';

const getUserRoleText = (user) => {
    if (user?.department?.name) {
        return `${user.department.name}`;
    }
    else if (user?.college?.name) {
        return `${user.college.name}`;
    }
    else if (user?.role) {
        const formattedRole = user.role.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
        return formattedRole;
    }
    return 'N/A';
};

const UserCard = ({ user, onEdit, onDelete }) => {
    if (!user) {
        return null;
    }

    const roleText = getUserRoleText(user);
    const userRole = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

    return (
        <div className="user-card-professional">
            <div className="card-header">
                <div className="user-info-header">
                    <h4 className="user-name-professional">{user.name || 'Unnamed User'}</h4>
                    <div className="user-role-professional">{userRole}</div>
                </div>
                <div className="user-id-professional">{user.collegeId || 'No ID'}</div>
            </div>

            <div className="card-divider"></div>

            <div className="card-content">
                <div className="info-item">
                    <div className="info-label-professional">Email Address</div>
                    <div className="info-value-professional">{user.email || 'Not Provided'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label-professional">Affiliation</div>
                    <div className="info-value-professional">{roleText}</div>
                </div>

                {user.course?.name && (
                    <div className="info-item">
                        <div className="info-label-professional">Course Enrolled</div>
                        <div className="info-value-professional">{user.course.name}</div>
                    </div>
                )}

                {user.semester?.number && (
                    <div className="info-item">
                        <div className="info-label-professional">Current Semester</div>
                        <div className="info-value-professional">Semester {user.semester.number}</div>
                    </div>
                )}
            </div>

            {(onEdit && onDelete) && (
                <div className="card-actions">
                    <button
                        onClick={() => onEdit(user)}
                        className="action-btn-professional btn-edit"
                    >
                        Edit Record
                    </button>
                    <button
                        onClick={() => onDelete(user._id)}
                        className="action-btn-professional btn-delete"
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserCard;