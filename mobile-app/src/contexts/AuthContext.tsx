import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { getCurrentUser, clearAuth } from '@/store/slices/authSlice';
import { User } from '@/store/slices/authSlice';

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: User | null;
  initializeAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const dispatch = useDispatch();

  const initializeAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');

      if (token && userData) {
        // Verify token is still valid by fetching current user
        const result = await dispatch(getCurrentUser() as any);
        if (getCurrentUser.fulfilled.match(result)) {
          setIsAuthenticated(true);
          setUser(result.payload);
        } else {
          // Token is invalid, clear storage
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          dispatch(clearAuth());
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Clear any invalid data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      dispatch(clearAuth());
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const value: AuthContextType = {
    isInitialized,
    isAuthenticated,
    user,
    initializeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};