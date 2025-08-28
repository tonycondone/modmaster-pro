import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import { RootState } from '../store';
import { navigationRef } from '../services/navigationService';

// Auth Stack Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';

// Splash Screen
import SplashScreen from '../screens/SplashScreen';

// Main App
import MainTabNavigator from './MainTabNavigator';

// Stack Screens
import VehicleDetailsScreen from '../screens/vehicles/VehicleDetailsScreen';
import AddVehicleScreen from '../screens/vehicles/AddVehicleScreen';
import EditVehicleScreen from '../screens/vehicles/EditVehicleScreen';
import MaintenanceScreen from '../screens/vehicles/MaintenanceScreen';
import PartDetailsScreen from '../screens/marketplace/PartDetailsScreen';
import SearchScreen from '../screens/marketplace/SearchScreen';
import CartScreen from '../screens/marketplace/CartScreen';
import CheckoutScreen from '../screens/marketplace/CheckoutScreen';
import OrderConfirmationScreen from '../screens/marketplace/OrderConfirmationScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import ScanHistoryScreen from '../screens/scans/ScanHistoryScreen';
import ScanResultsScreen from '../screens/scans/ScanResultsScreen';
import ScanPreviewScreen from '../screens/scans/ScanPreviewScreen';

export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
  
  // Main App
  Main: undefined;
  
  // Vehicle Stack
  VehicleDetails: { vehicleId: string };
  AddVehicle: undefined;
  EditVehicle: { vehicleId: string };
  Maintenance: { vehicleId: string };
  
  // Marketplace Stack
  PartDetails: { partId: string };
  Search: { query?: string; category?: string };
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  
  // Orders Stack
  OrderDetails: { orderId: string };
  OrderHistory: undefined;
  
  // Profile Stack
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  
  // Scan Stack
  ScanHistory: undefined;
  ScanResults: { scanId: string };
  ScanPreview: { vehicleId?: string };
  
  // Utility
  Splash: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'modmasterpro://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Scan: 'scan',
          Marketplace: 'marketplace',
          Vehicles: 'vehicles',
          Profile: 'profile',
        },
      },
      VehicleDetails: 'vehicle/:vehicleId',
      PartDetails: 'part/:partId',
      ScanResults: 'scan-results/:scanId',
      OrderDetails: 'order/:orderId',
      ResetPassword: 'reset-password/:token',
      VerifyEmail: 'verify-email/:email',
    },
  },
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }

    // Check if there is an initial notification
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data.url as string;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => listener(url);

    // Listen to incoming links from deep linking
    const eventListenerSubscription = Linking.addEventListener('url', onReceiveURL);

    // Listen to push notifications
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data.url as string;
      if (url) {
        listener(url);
      }
    });

    return () => {
      eventListenerSubscription.remove();
      subscription.remove();
    };
  },
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Splash');

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // Token exists, verify it with the backend if needed
          setInitialRoute('Main');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        setInitialRoute('Login');
      } finally {
        setIsReady(true);
      }
    };

    checkAuthState();
  }, []);

  if (!isReady || isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Splash Screen */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Auth Stack */}
        {!isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : (
          <>
            {/* Main App */}
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator}
              options={{ animation: 'fade' }}
            />

            {/* Vehicle Screens */}
            <Stack.Screen 
              name="VehicleDetails" 
              component={VehicleDetailsScreen}
              options={{ headerShown: true, title: 'Vehicle Details' }}
            />
            <Stack.Screen 
              name="AddVehicle" 
              component={AddVehicleScreen}
              options={{ 
                headerShown: true, 
                title: 'Add Vehicle',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="EditVehicle" 
              component={EditVehicleScreen}
              options={{ headerShown: true, title: 'Edit Vehicle' }}
            />
            <Stack.Screen 
              name="Maintenance" 
              component={MaintenanceScreen}
              options={{ headerShown: true, title: 'Maintenance' }}
            />

            {/* Marketplace Screens */}
            <Stack.Screen 
              name="PartDetails" 
              component={PartDetailsScreen}
              options={{ headerShown: true, title: 'Part Details' }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{ headerShown: true, title: 'Search Parts' }}
            />
            <Stack.Screen 
              name="Cart" 
              component={CartScreen}
              options={{ headerShown: true, title: 'Shopping Cart' }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ headerShown: true, title: 'Checkout' }}
            />
            <Stack.Screen 
              name="OrderConfirmation" 
              component={OrderConfirmationScreen}
              options={{ 
                headerShown: true, 
                title: 'Order Confirmed',
                headerBackVisible: false
              }}
            />

            {/* Order Screens */}
            <Stack.Screen 
              name="OrderDetails" 
              component={OrderDetailsScreen}
              options={{ headerShown: true, title: 'Order Details' }}
            />
            <Stack.Screen 
              name="OrderHistory" 
              component={OrderHistoryScreen}
              options={{ headerShown: true, title: 'Order History' }}
            />

            {/* Profile Screens */}
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfileScreen}
              options={{ headerShown: true, title: 'Edit Profile' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{ headerShown: true, title: 'Notifications' }}
            />

            {/* Scan Screens */}
            <Stack.Screen 
              name="ScanHistory" 
              component={ScanHistoryScreen}
              options={{ headerShown: true, title: 'Scan History' }}
            />
            <Stack.Screen 
              name="ScanResults" 
              component={ScanResultsScreen}
              options={{ headerShown: true, title: 'Scan Results' }}
            />
            <Stack.Screen 
              name="ScanPreview" 
              component={ScanPreviewScreen}
              options={{ 
                headerShown: true, 
                title: 'Scan Part',
                presentation: 'modal'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;