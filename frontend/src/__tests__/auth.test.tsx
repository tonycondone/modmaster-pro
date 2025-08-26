import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { AuthProvider } from '../contexts/AuthContext';
import authReducer from '../store/slices/authSlice';
import api from '../services/api';

// Mock the API
jest.mock('../services/api');

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Toast
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  
  return (
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    it('should render login form', () => {
      const { getByText, getByLabelText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(getByText('ModMaster Pro')).toBeTruthy();
      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByLabelText('Email')).toBeTruthy();
      expect(getByLabelText('Password')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
    });

    it('should validate email format', async () => {
      const { getByLabelText, getByText, queryByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByLabelText('Email');
      const loginButton = getByText('Login');

      // Enter invalid email
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Invalid email address')).toBeTruthy();
      });
    });

    it('should validate password length', async () => {
      const { getByLabelText, getByText, queryByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByLabelText('Email');
      const passwordInput = getByLabelText('Password');
      const loginButton = getByText('Login');

      // Enter valid email but short password
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'short');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('should handle successful login', async () => {
      const mockLoginResponse = {
        data: {
          user: {
            id: '123',
            email: 'test@example.com',
            username: 'testuser',
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
          sessionId: 'mock-session-id',
        },
      };

      (api.login as jest.Mock).mockResolvedValueOnce(mockLoginResponse);

      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByLabelText('Email');
      const passwordInput = getByLabelText('Password');
      const loginButton = getByText('Login');

      // Enter valid credentials
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Test@1234');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith('test@example.com', 'Test@1234');
      });
    });

    it('should handle login error', async () => {
      const mockError = new Error('Invalid credentials');
      (api.login as jest.Mock).mockRejectedValueOnce(mockError);

      const { getByLabelText, getByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByLabelText('Email');
      const passwordInput = getByLabelText('Password');
      const loginButton = getByText('Login');

      // Enter credentials
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(api.login).toHaveBeenCalled();
      });
    });

    it('should toggle password visibility', () => {
      const { getByLabelText, getByTestId } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const passwordInput = getByLabelText('Password');
      
      // Password should be hidden initially
      expect(passwordInput.props.secureTextEntry).toBe(true);

      // Toggle visibility
      const toggleButton = getByTestId('password-toggle');
      fireEvent.press(toggleButton);

      // Password should be visible
      expect(passwordInput.props.secureTextEntry).toBe(false);
    });

    it('should navigate to forgot password', () => {
      const mockNavigate = jest.fn();
      jest.mock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({
          navigate: mockNavigate,
        }),
      }));

      const { getByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const forgotPasswordButton = getByText('Forgot Password?');
      fireEvent.press(forgotPasswordButton);

      expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
    });
  });
});