import React, { createContext, useContext, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { login, logout, register } from '../store/slices/authSlice';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);

  const signIn = async (email: string, password: string) => {
    await dispatch(login({ email, password })).unwrap();
  };

  const signUp = async (data: any) => {
    await dispatch(register(data)).unwrap();
  };

  const signOut = async () => {
    await dispatch(logout()).unwrap();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        signIn,
        signUp,
        signOut,
      }}
    >
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