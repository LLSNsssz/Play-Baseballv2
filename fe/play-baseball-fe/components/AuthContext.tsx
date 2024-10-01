import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosInstance from './axiosInstance';
import { MEMBER_MY } from '@/constants/endpoints';

interface AuthContextType {
    isLoggedIn: boolean;
    isEmailVerified: boolean;
    setAuthStatus: (loggedIn: boolean, emailVerified: boolean) => void;
    checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const setAuthStatus = (loggedIn: boolean, emailVerified: boolean) => {
        setIsLoggedIn(loggedIn);
        setIsEmailVerified(emailVerified);
    };

    const checkAuthStatus = async () => {
        const token = localStorage.getItem('Authorization');
        if (token) {
            try {
                const response = await axiosInstance.get(MEMBER_MY);
                setAuthStatus(true, response.data.data.emailVerified);
            } catch (error) {
                setAuthStatus(false, false);
                localStorage.removeItem('Authorization');
            }
        } else {
            setAuthStatus(false, false);
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    return (
        <AuthContext.Provider value={{ isLoggedIn, isEmailVerified, setAuthStatus, checkAuthStatus }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};