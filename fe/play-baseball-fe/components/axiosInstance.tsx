import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined in environment variables');
}

const axiosInstance: AxiosInstance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('Authorization');
        if (token) {
            config.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        const newAccessToken = response.headers['authorization'];
        if (newAccessToken) {
            const tokenWithoutBearer = newAccessToken.replace('Bearer ', '');
            localStorage.setItem('Authorization', tokenWithoutBearer);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${tokenWithoutBearer}`;
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('Authorization');
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export const handleApiError = (error: unknown): void => {
    if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data);
    } else {
        console.error('Unknown Error:', error);
    }
};

export default axiosInstance;