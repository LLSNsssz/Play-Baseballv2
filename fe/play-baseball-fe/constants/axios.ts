import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { SERVER_URL, MEMBER_LOGIN } from './endpoints';

const api: AxiosInstance = axios.create({
    baseURL: SERVER_URL,
    withCredentials: true,
});

axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('Authorization');
        if (token) {
            config.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error("Axios request error:", error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        const newToken = response.headers['authorization'];
        if (newToken) {
            // Remove any existing 'Bearer ' prefix before storing
            const tokenWithoutBearer = newToken.replace(/^Bearer\s+/, '');
            localStorage.setItem('Authorization', tokenWithoutBearer);
            api.defaults.headers.common['Authorization'] = `Bearer ${tokenWithoutBearer}`;
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('Authorization');
            window.location.href = MEMBER_LOGIN;
        }
        return Promise.reject(error);
    }
);

export default api;