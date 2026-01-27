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

export const getUserRoleText = (user) => {
    if (user?.role) {
        const formattedRole = user.role.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
        return formattedRole;
    }
    return 'Guest';
};
const UserCard = ({ user, onEdit, onDelete }) => {

    if (!user) {
        return null;
    }

    return (
        <div className="user-card-professional">
            <div className="card-header">
                <div className="user-info-header">
                    <h4 className="user-name-professional">{user.name || 'Unnamed User'}</h4>
                    <div className="user-role-professional">{getUserRoleText(user)}</div>
                </div>
                <div className="user-id-professional">{user.collegeId || 'No ID'}</div>
            </div>

            <div className="card-divider"></div>

            <div className="card-content">
                {(user?.role === 'teacher' || user?.role === 'hod') &&
                    (<div className="info-item">
                        <div className="info-label-professional">Department</div>
                        <div className="info-value-professional">{user?.department?.name || 'Not Provided'}</div>
                    </div>)
                }
                {user?.role === 'university_affairs' && (<div className="info-item">
                    <div className="info-label-professional">Assigned College</div>
                    <div className="info-value-professional">{user?.college?.name || 'Not Provided'}</div>
                </div>)}
                <div className="info-item">
                    <div className="info-label-professional">Email Address</div>
                    <div className="info-value-professional">{user.email || 'Not Provided'}</div>
                </div>

                {/* <div className="info-item">
                    <div className="info-label-professional">
                        {(user?.role === "student" || user?.role === "teacher" || user?.role === "HOD") ? "Designation" : "Affiliation"}
                    </div>
                    <div className="info-value-professional">{roleText}</div>
                </div> */}

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
                <div className="info-item">
                    <div className="info-label-professional">Account Created On</div>
                    <div className="info-value-professional">{new Date(user.createdAt).toLocaleDateString("en-UK") || 'Not Provided'}</div>
                </div>
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