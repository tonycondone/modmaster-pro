import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/contexts/AuthContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Auth Screens
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';

// Main App Screens
import MainTabNavigator from './MainTabNavigator';

// Loading Screen
import LoadingScreen from '@/screens/LoadingScreen';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { isInitialized, isAuthenticated } = useAuth();
  const { isAuthenticated: reduxAuth } = useSelector((state: RootState) => state.auth);

  // Show loading screen while initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated && !reduxAuth ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        // Main App Stack
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;