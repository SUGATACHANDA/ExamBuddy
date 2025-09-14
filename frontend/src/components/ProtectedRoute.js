// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
    const { userInfo } = useAuth();

    if (!userInfo) {
        return <Navigate to="/login" replace />;
    }

    // If a specific role is required and the user's role doesn't match
    if (role && userInfo.role !== role) {
        // Redirect them to a relevant dashboard or an unauthorized page
        return <Navigate to={userInfo.role === 'student' ? '/student/dashboard' : '/teacher/dashboard'} replace />;
    }

    return children;
};

export default ProtectedRoute;