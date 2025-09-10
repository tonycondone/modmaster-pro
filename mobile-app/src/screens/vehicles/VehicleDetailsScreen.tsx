<<<<<<< HEAD
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
=======
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, FAB, Chip, Menu, Divider, ProgressBar } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchVehicleById,
  deleteVehicle,
  getMaintenanceHistory,
} from '../../store/slices/vehicleSlice';
import { fetchScanHistory } from '../../store/slices/scanSlice';
import { showToast } from '../../utils/toast';
import { format, formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

type RouteParams = {
  VehicleDetails: {
    vehicleId: string;
  };
};

const VehicleDetailsScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const vehicle = useAppSelector(state => state.vehicles.currentVehicle);
  const scanHistory = useAppSelector(state => 
    state.scan.scanHistory.filter(scan => scan.vehicleId === vehicle?.id)
  );

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'VehicleDetails'>>();
  const { vehicleId } = route.params;

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadData();
  }, [vehicleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        dispatch(fetchVehicleById(vehicleId)).unwrap(),
        dispatch(getMaintenanceHistory(vehicleId)).unwrap(),
        dispatch(fetchScanHistory({ vehicleId })).unwrap(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle details');
      Alert.alert('Error', 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [vehicleId]);

  // Handlers
  const handleEdit = () => {
    setMenuVisible(false);
    navigation.navigate('EditVehicle', { vehicleId });
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}?`,
>>>>>>> v.3.0
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
<<<<<<< HEAD
              await dispatch(deleteVehicle(vehicleId) as any);
=======
              await dispatch(deleteVehicle(vehicleId)).unwrap();
              showToast('Vehicle deleted successfully', 'success');
>>>>>>> v.3.0
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
<<<<<<< HEAD
    navigation.navigate('AddMaintenance' as never, { vehicleId } as never);
  };

  const handleViewScans = () => {
    navigation.navigate('VehicleScans' as never, { vehicleId } as never);
  };

  if (loading && !currentVehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
=======
    navigation.navigate('Maintenance', { vehicleId });
  };

  const handleQuickScan = () => {
    navigation.navigate('Scan', { 
      screen: 'ScanPreview',
      params: { vehicleId }
    });
  };

  const handleViewParts = () => {
    navigation.navigate('Parts', {
      screen: 'BrowseParts',
      params: {
        vehicleMake: vehicle?.make,
        vehicleModel: vehicle?.model,
        vehicleYear: vehicle?.year,
      },
    });
  };

  const handleExportData = () => {
    setMenuVisible(false);
    // TODO: Implement export functionality
    showToast('Export feature coming soon', 'info');
  };

  const handleShare = () => {
    setMenuVisible(false);
    // TODO: Implement share functionality
    showToast('Share feature coming soon', 'info');
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
  if (loading && !vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
>>>>>>> v.3.0
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

<<<<<<< HEAD
  if (error || !currentVehicle) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="car-off" size={64} color="#666" />
        <Text style={styles.errorText}>Vehicle not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
=======
  if (!vehicle) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="car-off" size={64} color="#999" />
        <Text style={styles.errorText}>Vehicle not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
>>>>>>> v.3.0
      </View>
    );
  }

<<<<<<< HEAD
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
=======
  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setMenuVisible(true)}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color="#333" />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={handleEdit} title="Edit Vehicle" leadingIcon="pencil" />
            <Menu.Item onPress={handleShare} title="Share" leadingIcon="share-variant" />
            <Menu.Item onPress={handleExportData} title="Export Data" leadingIcon="download" />
            <Divider />
            <Menu.Item
              onPress={handleDelete}
              title="Delete Vehicle"
              leadingIcon="delete"
              titleStyle={{ color: '#FF3B30' }}
            />
          </Menu>
        </View>

        {/* Vehicle Images */}
        {vehicle.photos && vehicle.photos.length > 0 ? (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
            >
              {vehicle.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.vehicleImage} />
              ))}
            </ScrollView>
            {vehicle.photos.length > 1 && (
              <View style={styles.imageIndicators}>
                {vehicle.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageIndicator,
                      index === selectedImageIndex && styles.imageIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <MaterialCommunityIcons name="car" size={80} color="#999" />
            <Text style={styles.noImageText}>No photos added</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleEdit}>
              <Text style={styles.addPhotoButtonText}>Add Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vehicle Basic Info */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.vehicleName}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
            {vehicle.trim && <Text style={styles.vehicleTrim}>{vehicle.trim}</Text>}
            
            <View style={styles.infoGrid}>
              {vehicle.vin && (
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="identifier" size={20} color="#666" />
                  <Text style={styles.infoLabel}>VIN</Text>
                  <Text style={styles.infoValue}>{vehicle.vin}</Text>
                </View>
              )}
              {vehicle.licensePlate && (
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="card-text" size={20} color="#666" />
                  <Text style={styles.infoLabel}>License Plate</Text>
                  <Text style={styles.infoValue}>{vehicle.licensePlate}</Text>
                </View>
              )}
              {vehicle.mileage !== undefined && (
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="speedometer" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Mileage</Text>
                  <Text style={styles.infoValue}>{vehicle.mileage.toLocaleString()} mi</Text>
                </View>
              )}
              {vehicle.color && (
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="palette" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Color</Text>
                  <Text style={styles.infoValue}>{vehicle.color}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleQuickScan}>
            <MaterialCommunityIcons name="camera" size={24} color="#0066CC" />
            <Text style={styles.quickActionText}>Scan Part</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleViewParts}>
            <MaterialCommunityIcons name="store" size={24} color="#0066CC" />
            <Text style={styles.quickActionText}>Find Parts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleAddMaintenance}>
            <MaterialCommunityIcons name="wrench" size={24} color="#0066CC" />
            <Text style={styles.quickActionText}>Maintenance</Text>
          </TouchableOpacity>
        </View>

        {/* Maintenance Status */}
        <Card style={styles.maintenanceCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Maintenance Status</Text>
              <TouchableOpacity onPress={handleAddMaintenance}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            
            {vehicle.maintenanceCount && vehicle.maintenanceCount > 0 ? (
              <View>
                <View style={styles.maintenanceAlert}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#FF6F00" />
                  <Text style={styles.maintenanceAlertText}>
                    {vehicle.maintenanceCount} maintenance items due
                  </Text>
                </View>
                {/* TODO: Show actual maintenance items */}
              </View>
            ) : (
              <View style={styles.maintenanceGood}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.maintenanceGoodText}>All maintenance up to date</Text>
              </View>
            )}
            
            {vehicle.lastMaintenanceAt && (
              <Text style={styles.lastMaintenanceText}>
                Last maintenance: {formatDistanceToNow(new Date(vehicle.lastMaintenanceAt), { addSuffix: true })}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Engine Details */}
        {vehicle.engine && (
          <Card style={styles.engineCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Engine Details</Text>
              <View style={styles.engineGrid}>
                {vehicle.engine.size && (
                  <View style={styles.engineItem}>
                    <Text style={styles.engineLabel}>Engine Size</Text>
                    <Text style={styles.engineValue}>{vehicle.engine.size}</Text>
                  </View>
                )}
                {vehicle.engine.cylinders && (
                  <View style={styles.engineItem}>
                    <Text style={styles.engineLabel}>Cylinders</Text>
                    <Text style={styles.engineValue}>{vehicle.engine.cylinders}</Text>
                  </View>
                )}
                {vehicle.transmission && (
                  <View style={styles.engineItem}>
                    <Text style={styles.engineLabel}>Transmission</Text>
                    <Text style={styles.engineValue}>{vehicle.transmission}</Text>
                  </View>
                )}
                {vehicle.fuelType && (
                  <View style={styles.engineItem}>
                    <Text style={styles.engineLabel}>Fuel Type</Text>
                    <Text style={styles.engineValue}>{vehicle.fuelType}</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Recent Scans */}
        {scanHistory.length > 0 && (
          <Card style={styles.scansCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Scan', { screen: 'ScanHistory' })}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {scanHistory.slice(0, 3).map((scan) => (
                <TouchableOpacity
                  key={scan.id}
                  style={styles.scanItem}
                  onPress={() => navigation.navigate('ScanResults', { scanId: scan.id })}
                >
                  <MaterialCommunityIcons
                    name={scan.status === 'completed' ? 'check-circle' : 'progress-clock'}
                    size={20}
                    color={scan.status === 'completed' ? '#4CAF50' : '#FF6F00'}
                  />
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanPartCount}>
                      {scan.identifiedParts.length} parts identified
                    </Text>
                    <Text style={styles.scanDate}>
                      {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Additional Info */}
        {(vehicle.purchaseDate || vehicle.purchasePrice || vehicle.notes) && (
          <Card style={styles.additionalCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              {vehicle.purchaseDate && (
                <View style={styles.additionalItem}>
                  <Text style={styles.additionalLabel}>Purchase Date</Text>
                  <Text style={styles.additionalValue}>
                    {format(new Date(vehicle.purchaseDate), 'MMMM d, yyyy')}
                  </Text>
                </View>
              )}
              {vehicle.purchasePrice && (
                <View style={styles.additionalItem}>
                  <Text style={styles.additionalLabel}>Purchase Price</Text>
                  <Text style={styles.additionalValue}>
                    ${vehicle.purchasePrice.toLocaleString()}
                  </Text>
                </View>
              )}
              {vehicle.notes && (
                <View style={styles.additionalItem}>
                  <Text style={styles.additionalLabel}>Notes</Text>
                  <Text style={styles.additionalValue}>{vehicle.notes}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="wrench"
        onPress={handleAddMaintenance}
        label="Add Maintenance"
      />
    </View>
>>>>>>> v.3.0
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: '#f5f5f5',
=======
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 100,
>>>>>>> v.3.0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
<<<<<<< HEAD
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
=======
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
>>>>>>> v.3.0
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
<<<<<<< HEAD
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
=======
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
  headerActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
  },
  imageSection: {
    height: 250,
    backgroundColor: '#000',
  },
  vehicleImage: {
    width,
    height: 250,
    resizeMode: 'cover',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  noImageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  addPhotoButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#0066CC',
    borderRadius: 20,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    margin: 16,
    elevation: 2,
  },
  vehicleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vehicleTrim: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  infoItem: {
    width: '50%',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionText: {
    fontSize: 12,
    color: '#0066CC',
    marginTop: 4,
  },
  maintenanceCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
>>>>>>> v.3.0
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
<<<<<<< HEAD
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
=======
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#0066CC',
  },
  maintenanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
  },
  maintenanceAlertText: {
    fontSize: 14,
    color: '#FF6F00',
    marginLeft: 8,
    fontWeight: '500',
  },
  maintenanceGood: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  maintenanceGoodText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  lastMaintenanceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  engineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  engineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  engineItem: {
    width: '50%',
    marginBottom: 12,
  },
  engineLabel: {
    fontSize: 12,
    color: '#666',
  },
  engineValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  scansCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  scanInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scanPartCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  scanDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  additionalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  additionalItem: {
    marginTop: 12,
  },
  additionalLabel: {
    fontSize: 12,
    color: '#666',
  },
  additionalValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
>>>>>>> v.3.0
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
<<<<<<< HEAD
  },
});

export default VehicleDetailsScreen;
=======
    backgroundColor: '#0066CC',
  },
});
>>>>>>> v.3.0
