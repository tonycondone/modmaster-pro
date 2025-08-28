import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, ProgressBar, FAB } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchVehicles } from '../../store/slices/vehicleSlice';
import { fetchScanStats } from '../../store/slices/scanSlice';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.profile);
  const vehicles = useAppSelector(state => state.vehicles.vehicles);
  const scanStats = useAppSelector(state => state.scan.scanStats);
  const recentScans = useAppSelector(state => state.scan.recentScans);
  const notificationCount = useAppSelector(state => state.user.notificationCount);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        dispatch(fetchUserProfile()).unwrap(),
        dispatch(fetchVehicles({ limit: 5 })).unwrap(),
        dispatch(fetchScanStats()).unwrap(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Quick action handlers
  const handleQuickScan = () => {
    navigation.navigate('Scan', { screen: 'ScanPreview' });
  };

  const handleBrowseParts = () => {
    navigation.navigate('Parts', { screen: 'BrowseParts' });
  };

  const handleAddVehicle = () => {
    navigation.navigate('Vehicles', { screen: 'AddVehicle' });
  };

  const handleViewNotifications = () => {
    navigation.navigate('Notifications');
  };

  // 5. ERROR HANDLING - MANDATORY
  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 6. LOADING STATE - MANDATORY
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.firstName || 'User'}!</Text>
            </View>
            <TouchableOpacity onPress={handleViewNotifications} style={styles.notificationButton}>
              <MaterialCommunityIcons name="bell" size={24} color="#333" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction} onPress={handleQuickScan}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="camera" size={32} color="#0066CC" />
              </View>
              <Text style={styles.quickActionText}>Scan Part</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleBrowseParts}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="store" size={32} color="#FF6F00" />
              </View>
              <Text style={styles.quickActionText}>Browse Parts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={handleAddVehicle}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="car-plus" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Add Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction} 
              onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
                <MaterialCommunityIcons name="account-settings" size={32} color="#9C27B0" />
              </View>
              <Text style={styles.quickActionText}>My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Overview */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Your Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{vehicles.length}</Text>
                <Text style={styles.statLabel}>Vehicles</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{scanStats.totalScans}</Text>
                <Text style={styles.statLabel}>Total Scans</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.stats?.orderCount || 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {scanStats.averageConfidence ? `${Math.round(scanStats.averageConfidence)}%` : '0%'}
                </Text>
                <Text style={styles.statLabel}>Scan Accuracy</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Vehicles */}
        {vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Vehicles</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Vehicles', { screen: 'VehicleList' })}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {vehicles.slice(0, 5).map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  onPress={() => navigation.navigate('VehicleDetails', { vehicleId: vehicle.id })}
                >
                  <Card style={styles.vehicleCard}>
                    <View style={styles.vehicleContent}>
                      <MaterialCommunityIcons name="car" size={40} color="#0066CC" />
                      <Text style={styles.vehicleName}>
                        {vehicle.year} {vehicle.make}
                      </Text>
                      <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                      {vehicle.maintenanceCount && vehicle.maintenanceCount > 0 && (
                        <View style={styles.maintenanceBadge}>
                          <MaterialCommunityIcons name="wrench" size={12} color="#FF6F00" />
                          <Text style={styles.maintenanceText}>
                            {vehicle.maintenanceCount} due
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Scan', { screen: 'ScanHistory' })}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentScans.slice(0, 3).map((scan) => (
              <TouchableOpacity
                key={scan.id}
                onPress={() => navigation.navigate('ScanResults', { scanId: scan.id })}
              >
                <Card style={styles.scanCard}>
                  <Card.Content style={styles.scanContent}>
                    <View style={styles.scanInfo}>
                      <MaterialCommunityIcons
                        name={scan.status === 'completed' ? 'check-circle' : 'progress-clock'}
                        size={24}
                        color={scan.status === 'completed' ? '#4CAF50' : '#FF6F00'}
                      />
                      <View style={styles.scanDetails}>
                        <Text style={styles.scanPartsCount}>
                          {scan.identifiedParts.length} parts identified
                        </Text>
                        <Text style={styles.scanTime}>
                          {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State for New Users */}
        {vehicles.length === 0 && scanStats.totalScans === 0 && (
          <Card style={styles.emptyStateCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="rocket-launch"
                size={64}
                color="#0066CC"
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateTitle}>Get Started!</Text>
              <Text style={styles.emptyStateText}>
                Add your first vehicle or scan a part to begin your ModMaster Pro journey.
              </Text>
              <View style={styles.emptyStateActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddVehicle}>
                  <Text style={styles.primaryButtonText}>Add Vehicle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleQuickScan}>
                  <Text style={styles.secondaryButtonText}>Scan Part</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="camera"
        onPress={handleQuickScan}
        label="Quick Scan"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - 50) / 2,
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActionIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statsCard: {
    margin: 20,
    marginTop: 0,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  vehicleCard: {
    width: 140,
    marginLeft: 20,
    elevation: 2,
  },
  vehicleContent: {
    padding: 16,
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  vehicleModel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  maintenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  maintenanceText: {
    fontSize: 10,
    color: '#FF6F00',
    marginLeft: 4,
  },
  scanCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    elevation: 1,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanDetails: {
    marginLeft: 12,
  },
  scanPartsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  scanTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyStateCard: {
    margin: 20,
    elevation: 2,
  },
  emptyStateIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
});