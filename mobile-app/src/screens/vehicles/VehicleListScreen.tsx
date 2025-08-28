import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, FAB, Chip, SegmentedButtons, Menu, Divider } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchVehicles, deleteVehicle } from '../../store/slices/vehicleSlice';
import { Vehicle } from '../../store/slices/vehicleSlice';

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'maintenance';

const VehicleListScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const { vehicles, isLoading, error: vehiclesError, pagination } = useAppSelector(state => state.vehicles);
  const user = useAppSelector(state => state.auth.user);

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
      await dispatch(fetchVehicles({ page: 1, limit: 20 })).unwrap();
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicles');
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadMoreVehicles = async () => {
    if (pagination.page < pagination.pages && !isLoading) {
      await dispatch(fetchVehicles({ page: pagination.page + 1, limit: 20 })).unwrap();
    }
  };

  // Filter and sort vehicles
  const filteredAndSortedVehicles = React.useMemo(() => {
    let filtered = vehicles;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(vehicle =>
        `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vin?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filters
    if (selectedFilters.length > 0) {
      if (selectedFilters.includes('maintenance_due')) {
        filtered = filtered.filter(v => v.maintenanceCount && v.maintenanceCount > 0);
      }
      if (selectedFilters.includes('active')) {
        filtered = filtered.filter(v => v.active);
      }
    }

    // Sort vehicles
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
        break;
      case 'maintenance':
        sorted.sort((a, b) => (b.maintenanceCount || 0) - (a.maintenanceCount || 0));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return sorted;
  }, [vehicles, searchQuery, selectedFilters, sortBy]);

  // Handlers
  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle');
  };

  const handleVehiclePress = (vehicle: Vehicle) => {
    navigation.navigate('VehicleDetails', { vehicleId: vehicle.id });
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    navigation.navigate('EditVehicle', { vehicleId: vehicle.id });
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteVehicle(vehicle.id)).unwrap();
              Alert.alert('Success', 'Vehicle deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  // Render vehicle card
  const renderVehicleCard = ({ item }: { item: Vehicle }) => {
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleVehiclePress(item)}
          onLongPress={() => handleEditVehicle(item)}
        >
          <Card style={styles.gridCard}>
            <View style={styles.gridCardContent}>
              {item.photos && item.photos.length > 0 ? (
                <Image source={{ uri: item.photos[0] }} style={styles.vehicleImage} />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <MaterialCommunityIcons name="car" size={48} color="#999" />
                </View>
              )}
              <Text style={styles.vehicleMake}>{item.make}</Text>
              <Text style={styles.vehicleModel}>{item.model}</Text>
              <Text style={styles.vehicleYear}>{item.year}</Text>
              {item.maintenanceCount && item.maintenanceCount > 0 && (
                <View style={styles.maintenanceBadge}>
                  <MaterialCommunityIcons name="wrench" size={12} color="#FF6F00" />
                  <Text style={styles.maintenanceText}>{item.maintenanceCount}</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={() => handleVehiclePress(item)}>
        <Card style={styles.listCard}>
          <Card.Content style={styles.listCardContent}>
            <View style={styles.listImageContainer}>
              {item.photos && item.photos.length > 0 ? (
                <Image source={{ uri: item.photos[0] }} style={styles.listVehicleImage} />
              ) : (
                <View style={styles.listVehicleImagePlaceholder}>
                  <MaterialCommunityIcons name="car" size={32} color="#999" />
                </View>
              )}
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {item.year} {item.make} {item.model}
              </Text>
              {item.licensePlate && (
                <Text style={styles.vehicleDetail}>
                  <MaterialCommunityIcons name="card-text" size={14} color="#666" />
                  {' '}{item.licensePlate}
                </Text>
              )}
              {item.mileage && (
                <Text style={styles.vehicleDetail}>
                  <MaterialCommunityIcons name="speedometer" size={14} color="#666" />
                  {' '}{item.mileage.toLocaleString()} miles
                </Text>
              )}
              <View style={styles.vehicleActions}>
                {item.maintenanceCount && item.maintenanceCount > 0 && (
                  <Chip
                    icon="wrench"
                    style={styles.maintenanceChip}
                    textStyle={styles.maintenanceChipText}
                  >
                    {item.maintenanceCount} maintenance due
                  </Chip>
                )}
              </View>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditVehicle(item)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteVehicle(item)}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
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
  if (loading && vehicles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchFilterBar}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterMenuVisible(true)}
            >
              <MaterialCommunityIcons name="filter-variant" size={20} color="#0066CC" />
              {selectedFilters.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedFilters.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => toggleFilter('maintenance_due')}
            title="Maintenance Due"
            leadingIcon={selectedFilters.includes('maintenance_due') ? 'check' : undefined}
          />
          <Menu.Item
            onPress={() => toggleFilter('active')}
            title="Active Only"
            leadingIcon={selectedFilters.includes('active') ? 'check' : undefined}
          />
          <Divider />
          <Menu.Item
            onPress={() => setSelectedFilters([])}
            title="Clear Filters"
            leadingIcon="close"
          />
        </Menu>
      </View>

      {/* View Mode and Sort Controls */}
      <View style={styles.controls}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'grid', label: 'Grid', icon: 'view-grid' },
            { value: 'list', label: 'List', icon: 'view-list' },
          ]}
          style={styles.viewModeButtons}
        />
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <SegmentedButtons
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortBy)}
            buttons={[
              { value: 'date', label: 'Date' },
              { value: 'name', label: 'Name' },
              { value: 'maintenance', label: 'Maintenance' },
            ]}
            style={styles.sortButtons}
          />
        </View>
      </View>

      {/* Vehicle List */}
      {filteredAndSortedVehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="car-off" size={64} color="#999" />
          <Text style={styles.emptyStateTitle}>
            {searchQuery || selectedFilters.length > 0 ? 'No vehicles found' : 'No vehicles yet'}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedFilters.length > 0
              ? 'Try adjusting your search or filters'
              : 'Add your first vehicle to get started'}
          </Text>
          {!searchQuery && selectedFilters.length === 0 && (
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddVehicle}>
              <Text style={styles.addFirstButtonText}>Add Your First Vehicle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedVehicles}
          renderItem={renderVehicleCard}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render when view mode changes
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreVehicles}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && vehicles.length > 0 ? (
              <ActivityIndicator size="small" color="#0066CC" style={styles.loadingMore} />
            ) : null
          }
        />
      )}

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddVehicle}
        label="Add Vehicle"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchFilterBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewModeButtons: {
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortButtons: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gridItem: {
    flex: 1,
    margin: 8,
  },
  gridCard: {
    elevation: 2,
  },
  gridCardContent: {
    padding: 12,
    alignItems: 'center',
  },
  vehicleImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleMake: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vehicleModel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vehicleYear: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  maintenanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  maintenanceText: {
    fontSize: 12,
    color: '#FF6F00',
    marginLeft: 4,
    fontWeight: '600',
  },
  listCard: {
    marginBottom: 12,
    elevation: 2,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listImageContainer: {
    marginRight: 16,
  },
  listVehicleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  listVehicleImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vehicleActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  maintenanceChip: {
    backgroundColor: '#FFF3E0',
    height: 28,
  },
  maintenanceChipText: {
    fontSize: 12,
    color: '#FF6F00',
  },
  listActions: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  addFirstButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
});