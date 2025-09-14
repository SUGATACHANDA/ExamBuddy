// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userFromStorage = localStorage.getItem('userInfo');
        if (userFromStorage) {
            setUserInfo(JSON.parse(userFromStorage));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('userInfo', JSON.stringify(userData));
        setUserInfo(userData);
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
    };

    return (
        <AuthContext.Provider value={{ userInfo, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);