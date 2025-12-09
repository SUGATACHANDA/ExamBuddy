// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [examSubmitHandler, setExamSubmitHandler] = useState(null);
    const [submitExamHandler, setSubmitExamHandler] = useState(null);



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
        setSubmitExamHandler(null);
    };

    const updateUser = (newUserData) => {
        localStorage.getItem("user", JSON.stringify(newUserData));
        setUserInfo(newUserData);
    };

    const storeSubmitHandler = useCallback((handler) => {
        // We store the function directly. The handler is a function that returns a function.
        setSubmitExamHandler(() => handler);
    }, []);

    const clearContextSubmitHandler = useCallback(() => {
        setSubmitExamHandler(null);
    }, []);

    return (
        <AuthContext.Provider value={{
            userInfo, login, logout, submitExamHandler,
            storeSubmitHandler,
            clearContextSubmitHandler,
            updateUser
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);