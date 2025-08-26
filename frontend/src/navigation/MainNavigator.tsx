import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { ScanScreen } from '../screens/scan/ScanScreen';
import { PartsScreen } from '../screens/parts/PartsScreen';
import { GarageScreen } from '../screens/garage/GarageScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

// Detail screens
import { VehicleDetailScreen } from '../screens/garage/VehicleDetailScreen';
import { PartDetailScreen } from '../screens/parts/PartDetailScreen';
import { ProjectDetailScreen } from '../screens/projects/ProjectDetailScreen';
import { ScanResultScreen } from '../screens/scan/ScanResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack navigators for each tab
const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="HomeMain" 
      component={HomeScreen} 
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ScanStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ScanMain" 
      component={ScanScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="ScanResult" 
      component={ScanResultScreen}
      options={{ title: 'Scan Results' }}
    />
  </Stack.Navigator>
);

const PartsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="PartsMain" 
      component={PartsScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="PartDetail" 
      component={PartDetailScreen}
      options={{ title: 'Part Details' }}
    />
  </Stack.Navigator>
);

const GarageStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="GarageMain" 
      component={GarageScreen} 
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="VehicleDetail" 
      component={VehicleDetailScreen}
      options={{ title: 'Vehicle Details' }}
    />
    <Stack.Screen 
      name="ProjectDetail" 
      component={ProjectDetailScreen}
      options={{ title: 'Project Details' }}
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen} 
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export const MainNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
              iconName = focused ? 'car-cog' : 'car-cog';
              break;
            case 'Garage':
              iconName = focused ? 'garage' : 'garage-open';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Scan" component={ScanStack} />
      <Tab.Screen name="Parts" component={PartsStack} />
      <Tab.Screen name="Garage" component={GarageStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};