import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import HomeScreen from '@/screens/HomeScreen';
import ScanScreen from '@/screens/ScanScreen';
import BrowsePartsScreen from '@/screens/marketplace/BrowsePartsScreen';
import VehicleListScreen from '@/screens/vehicles/VehicleListScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Scan':
              iconName = focused ? 'camera' : 'camera-outline';
              break;
            case 'Parts':
              iconName = focused ? 'car-wrench' : 'car-wrench-outline';
              break;
            case 'Vehicles':
              iconName = focused ? 'car' : 'car-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{ title: 'Scan Parts' }}
      />
      <Tab.Screen 
        name="Parts" 
        component={BrowsePartsScreen}
        options={{ title: 'Marketplace' }}
      />
      <Tab.Screen 
        name="Vehicles" 
        component={VehicleListScreen}
        options={{ title: 'My Vehicles' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;