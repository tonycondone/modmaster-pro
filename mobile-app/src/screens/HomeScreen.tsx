import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  useTheme,
  Avatar,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchVehicles } from '@/store/slices/vehicleSlice';
import { fetchScans } from '@/store/slices/scanSlice';
import { fetchUserProfile } from '@/store/slices/userSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { vehicles, isLoading: vehiclesLoading } = useSelector((state: RootState) => state.vehicles);
  const { scans, isLoading: scansLoading } = useSelector((state: RootState) => state.scans);
  const { profile } = useSelector((state: RootState) => state.user);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchVehicles()),
        dispatch(fetchScans()),
        dispatch(fetchUserProfile()),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getRecentScans = () => {
    return scans.slice(0, 3);
  };

  const getVehicleStats = () => {
    const activeVehicles = vehicles.filter(v => v.isActive).length;
    const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
    return { activeVehicles, totalMileage };
  };

  const stats = getVehicleStats();
  const recentScans = getRecentScans();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>
              {user?.firstName || profile?.firstName || 'User'}
            </Text>
          </View>
          <Avatar.Text
            size={50}
            label={user?.firstName?.charAt(0) || profile?.firstName?.charAt(0) || 'U'}
            style={styles.avatar}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.quickActions}>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('Scan' as never)}>
            <Card.Content style={styles.actionContent}>
              <Icon name="camera" size={32} color={theme.colors.primary} />
              <Text style={styles.actionText}>Scan Parts</Text>
            </Card.Content>
          </Card>

          <Card style={styles.actionCard} onPress={() => navigation.navigate('Parts' as never)}>
            <Card.Content style={styles.actionContent}>
              <Icon name="car-wrench" size={32} color={theme.colors.secondary} />
              <Text style={styles.actionText}>Browse Parts</Text>
            </Card.Content>
          </Card>

          <Card style={styles.actionCard} onPress={() => navigation.navigate('Vehicles' as never)}>
            <Card.Content style={styles.actionContent}>
              <Icon name="car" size={32} color={theme.colors.tertiary} />
              <Text style={styles.actionText}>My Vehicles</Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Title style={styles.sectionTitle}>Overview</Title>
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="car" size={24} color={theme.colors.primary} />
              <Text style={styles.statNumber}>{stats.activeVehicles}</Text>
              <Text style={styles.statLabel}>Active Vehicles</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="camera" size={24} color={theme.colors.secondary} />
              <Text style={styles.statNumber}>{scans.length}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Icon name="speedometer" size={24} color={theme.colors.tertiary} />
              <Text style={styles.statNumber}>{Math.round(stats.totalMileage / 1000)}k</Text>
              <Text style={styles.statLabel}>Total Miles</Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Recent Scans */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>Recent Scans</Title>
          <Button
            mode="text"
            onPress={() => navigation.navigate('ScanHistory' as never)}
            compact
          >
            View All
          </Button>
        </View>

        {recentScans.length > 0 ? (
          recentScans.map((scan, index) => (
            <Card key={scan.id} style={styles.scanCard}>
              <Card.Content style={styles.scanContent}>
                <View style={styles.scanInfo}>
                  <Text style={styles.scanDate}>
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.scanStatus} numberOfLines={1}>
                    {scan.results.parts.length} parts identified
                  </Text>
                </View>
                <View style={styles.scanStatus}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: scan.status === 'completed' ? theme.colors.primary : theme.colors.error }
                    ]}
                  >
                    {scan.status}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="camera-off" size={48} color={theme.colors.outline} />
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySubtext}>
                Start by scanning a part to identify it
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Scan' as never)}
                style={styles.emptyButton}
              >
                Scan Your First Part
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Recent Vehicles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Title style={styles.sectionTitle}>My Vehicles</Title>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Vehicles' as never)}
            compact
          >
            View All
          </Button>
        </View>

        {vehicles.length > 0 ? (
          vehicles.slice(0, 2).map((vehicle) => (
            <Card key={vehicle.id} style={styles.vehicleCard}>
              <Card.Content style={styles.vehicleContent}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={styles.vehicleDetails}>
                    {vehicle.color} • {vehicle.mileage?.toLocaleString()} miles
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.colors.outline} />
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="car-off" size={48} color={theme.colors.outline} />
              <Text style={styles.emptyText}>No vehicles added</Text>
              <Text style={styles.emptySubtext}>
                Add your first vehicle to get started
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Vehicles' as never)}
                style={styles.emptyButton}
              >
                Add Vehicle
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    opacity: 0.7,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatar: {
    backgroundColor: '#2563eb',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    elevation: 2,
  },
  actionContent: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  scanCard: {
    marginBottom: 8,
    elevation: 1,
  },
  scanContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanInfo: {
    flex: 1,
  },
  scanDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  scanStatus: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  vehicleCard: {
    marginBottom: 8,
    elevation: 1,
  },
  vehicleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '500',
  },
  vehicleDetails: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 8,
  },
});

export default HomeScreen;