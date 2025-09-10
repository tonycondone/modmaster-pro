import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
<<<<<<< HEAD
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
=======
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';

// Import screens (to be created)
import HomeScreen from '../screens/home/HomeScreen';
import ScanPreviewScreen from '../screens/scan/ScanPreviewScreen';
import BrowsePartsScreen from '../screens/marketplace/BrowsePartsScreen';
import VehicleListScreen from '../screens/vehicles/VehicleListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Additional screens for stacks
import VehicleDetailsScreen from '../screens/vehicles/VehicleDetailsScreen';
import MaintenanceScreen from '../screens/vehicles/MaintenanceScreen';
import AddVehicleScreen from '../screens/vehicles/AddVehicleScreen';
import PartDetailsScreen from '../screens/marketplace/PartDetailsScreen';
import CartScreen from '../screens/marketplace/CartScreen';
import ScanResultsScreen from '../screens/scan/ScanResultsScreen';
import ScanHistoryScreen from '../screens/scan/ScanHistoryScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Dashboard' }} />
    <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} options={{ title: 'Vehicle Details' }} />
    <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Maintenance' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

// Scan Stack
const ScanStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="ScanPreview" component={ScanPreviewScreen} options={{ title: 'Scan Part' }} />
    <Stack.Screen name="ScanResults" component={ScanResultsScreen} options={{ title: 'Scan Results' }} />
    <Stack.Screen name="ScanHistory" component={ScanHistoryScreen} options={{ title: 'Scan History' }} />
  </Stack.Navigator>
);

// Parts Stack
const PartsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="BrowseParts" component={BrowsePartsScreen} options={{ title: 'Parts Marketplace' }} />
    <Stack.Screen name="PartDetails" component={PartDetailsScreen} options={{ title: 'Part Details' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
  </Stack.Navigator>
);

// Vehicles Stack
const VehiclesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ title: 'My Vehicles' }} />
    <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} options={{ title: 'Vehicle Details' }} />
    <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add Vehicle' }} />
    <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Maintenance' }} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

// Tab icon component with badge
const TabBarIcon = ({ name, color, size, badge }: { name: string; color: string; size: number; badge?: number }) => (
  <View style={styles.iconContainer}>
    <MaterialCommunityIcons name={name as any} color={color} size={size} />
    {badge && badge > 0 && (
      <Badge style={styles.badge} size={16}>
        {badge > 99 ? '99+' : badge}
      </Badge>
    )}
  </View>
);

const MainTabNavigator = () => {
  const cartItemCount = useAppSelector(state => state.cart.items.length);
  const notificationCount = useAppSelector(state => state.user.notificationCount);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home" color={color} size={size} badge={notificationCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanStack}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Parts"
        component={PartsStack}
        options={{
          tabBarLabel: 'Parts',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="store" color={color} size={size} badge={cartItemCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehiclesStack}
        options={{
          tabBarLabel: 'Vehicles',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="car" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
>>>>>>> v.3.0
      />
    </Tab.Navigator>
  );
};

<<<<<<< HEAD
=======
const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF3B30',
  },
});

>>>>>>> v.3.0
export default MainTabNavigator;