import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Divider,
  List,
  FAB,
  Menu,
  IconButton,
  Avatar,
  Surface,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchVehicleById, deleteVehicle } from '@/store/slices/vehicleSlice';
import { fetchVehicleScans } from '@/store/slices/scanSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type VehicleDetailsRouteProp = RouteProp<
  { VehicleDetails: { vehicleId: string } },
  'VehicleDetails'
>;

const VehicleDetailsScreen: React.FC = () => {
  const route = useRoute<VehicleDetailsRouteProp>();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { vehicleId } = route.params;
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { currentVehicle, loading, error } = useSelector((state: RootState) => state.vehicles);
  const { scans } = useSelector((state: RootState) => state.scans);

  useEffect(() => {
    loadVehicleData();
  }, [vehicleId]);

  const loadVehicleData = async () => {
    try {
      await Promise.all([
        dispatch(fetchVehicleById(vehicleId) as any),
        dispatch(fetchVehicleScans(vehicleId) as any),
      ]);
    } catch (error) {
      console.error('Error loading vehicle data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVehicleData();
    setRefreshing(false);
  };

  const handleEditVehicle = () => {
    setMenuVisible(false);
    navigation.navigate('EditVehicle' as never, { vehicleId } as never);
  };

  const handleDeleteVehicle = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteVehicle(vehicleId) as any);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const handleAddMaintenance = () => {
    navigation.navigate('AddMaintenance' as never, { vehicleId } as never);
  };

  const handleViewScans = () => {
    navigation.navigate('VehicleScans' as never, { vehicleId } as never);
  };

  if (loading && !currentVehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

  if (error || !currentVehicle) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="car-off" size={64} color="#666" />
        <Text style={styles.errorText}>Vehicle not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const vehicleScans = scans.filter(scan => scan.vehicleId === vehicleId);
  const recentScans = vehicleScans.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.vehicleInfo}>
              <Title style={styles.vehicleTitle}>
                {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}
              </Title>
              {currentVehicle.trim && (
                <Paragraph style={styles.trim}>{currentVehicle.trim}</Paragraph>
              )}
              <View style={styles.statusChip}>
                <Chip
                  icon={currentVehicle.isActive ? 'check-circle' : 'pause-circle'}
                  mode="outlined"
                >
                  {currentVehicle.isActive ? 'Active' : 'Inactive'}
                </Chip>
              </View>
            </View>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item onPress={handleEditVehicle} title="Edit" icon="pencil" />
              <Menu.Item
                onPress={handleDeleteVehicle}
                title="Delete"
                icon="delete"
              />
            </Menu>
          </View>
        </Card.Content>
      </Card>

      {/* Vehicle Details */}
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Title>Vehicle Details</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Icon name="card-text" size={24} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>VIN</Text>
              <Text>{currentVehicle.vin || 'Not provided'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="engine" size={24} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Engine</Text>
              <Text>{currentVehicle.engine || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="car-shift-pattern" size={24} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Transmission</Text>
              <Text>{currentVehicle.transmission || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="gas-station" size={24} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Fuel Type</Text>
              <Text>{currentVehicle.fuelType || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="speedometer" size={24} color="#666" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Mileage</Text>
              <Text>{currentVehicle.mileage?.toLocaleString() || '0'} miles</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Scans */}
      <Card style={styles.scansCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>Recent Scans</Title>
            <Button
              mode="text"
              onPress={handleViewScans}
              disabled={vehicleScans.length === 0}
            >
              View All ({vehicleScans.length})
            </Button>
          </View>
          <Divider style={styles.divider} />

          {recentScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="camera-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySubtext}>
                Scan some parts to see them here
              </Text>
            </View>
          ) : (
            recentScans.map((scan, index) => (
              <List.Item
                key={scan.id}
                title={`Scan ${index + 1}`}
                description={new Date(scan.createdAt).toLocaleDateString()}
                left={(props) => (
                  <Avatar.Icon
                    {...props}
                    icon="camera"
                    size={40}
                    style={styles.scanAvatar}
                  />
                )}
                right={(props) => (
                  <Chip
                    {...props}
                    mode="outlined"
                    compact
                    icon={
                      scan.status === 'completed'
                        ? 'check'
                        : scan.status === 'failed'
                        ? 'close'
                        : 'clock'
                    }
                  >
                    {scan.status}
                  </Chip>
                )}
                onPress={() =>
                  navigation.navigate('ScanDetails' as never, { scanId: scan.id } as never)
                }
              />
            ))
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              icon="camera"
              onPress={() =>
                navigation.navigate('Scan' as never, { vehicleId } as never)
              }
              style={styles.actionButton}
            >
              Scan Parts
            </Button>
            
            <Button
              mode="outlined"
              icon="wrench"
              onPress={handleAddMaintenance}
              style={styles.actionButton}
            >
              Add Maintenance
            </Button>
            
            <Button
              mode="outlined"
              icon="chart-line"
              onPress={() =>
                navigation.navigate('VehicleStats' as never, { vehicleId } as never)
              }
              style={styles.actionButton}
            >
              View Stats
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />

      <FAB
        style={styles.fab}
        icon="camera"
        label="Scan Parts"
        onPress={() =>
          navigation.navigate('Scan' as never, { vehicleId } as never)
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginVertical: 16,
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trim: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  detailsCard: {
    margin: 16,
    marginVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scansCard: {
    margin: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scanAvatar: {
    backgroundColor: '#e3f2fd',
  },
  actionsCard: {
    margin: 16,
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  bottomSpacing: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default VehicleDetailsScreen;