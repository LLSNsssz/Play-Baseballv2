import React from 'react';
import { useAuth } from './AuthContext';

const WrapperStyles = "w-[100%] md:w-[70%] max-w-[1300px] m-auto";

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoggedIn, isEmailVerified } = useAuth();

    return (
        <div className={WrapperStyles}>
            {isLoggedIn && isEmailVerified === false && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                    <p className="font-bold">주의!</p>
                    <p>이메일 인증이 완료되지 않았습니다. 일부 기능이 제한될 수 있습니다.</p>
                    <p>마이페이지에서 이메일 인증을 진행해 주세요.</p>
                </div>
            )}
            {children}
        </div>
    );
}

export default Wrapper;