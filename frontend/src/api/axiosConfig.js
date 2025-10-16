// src/api/axiosConfig.js
import axios from 'axios';

const api = axios.create({
    // baseURL: 'https://exam-app-backend-sable.vercel.app/api', // Your backend URL
    // baseURL: 'http://localhost:5000/api', // Your backend URL
    baseURL: 'https://exam-buddy-backend.vercel.app/api', // Your backend URL

});

// Interceptor to add the token to every request
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo')
            ? JSON.parse(localStorage.getItem('userInfo'))
            : null;

        if (userInfo && userInfo.token) {
            config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;