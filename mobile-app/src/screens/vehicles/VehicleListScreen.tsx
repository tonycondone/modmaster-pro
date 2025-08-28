import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  FAB,
  useTheme,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchVehicles, deleteVehicle } from '@/store/slices/vehicleSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VehicleListScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { vehicles, isLoading } = useSelector((state: RootState) => state.vehicles);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      await dispatch(fetchVehicles());
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
    setRefreshing(false);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
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
              await dispatch(deleteVehicle(vehicleId)).unwrap();
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const renderVehicleItem = ({ item }: { item: any }) => (
    <Card style={styles.vehicleCard}>
      <Card.Content style={styles.vehicleContent}>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleHeader}>
            <Text style={styles.vehicleName}>
              {item.year} {item.make} {item.model}
            </Text>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(menuVisible === item.id ? null : item.id)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  navigation.navigate('VehicleDetails' as never, { vehicleId: item.id } as never);
                }}
                title="View Details"
                leadingIcon="eye"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  navigation.navigate('EditVehicle' as never, { vehicleId: item.id } as never);
                }}
                title="Edit"
                leadingIcon="pencil"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  handleDeleteVehicle(item.id);
                }}
                title="Delete"
                leadingIcon="delete"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          </View>
          
          <View style={styles.vehicleDetails}>
            <View style={styles.detailRow}>
              <Icon name="car" size={16} color={theme.colors.outline} />
              <Text style={styles.detailText}>{item.vin}</Text>
            </View>
            {item.licensePlate && (
              <View style={styles.detailRow}>
                <Icon name="card-text" size={16} color={theme.colors.outline} />
                <Text style={styles.detailText}>{item.licensePlate}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Icon name="palette" size={16} color={theme.colors.outline} />
              <Text style={styles.detailText}>{item.color || 'Color not specified'}</Text>
            </View>
            {item.mileage && (
              <View style={styles.detailRow}>
                <Icon name="speedometer" size={16} color={theme.colors.outline} />
                <Text style={styles.detailText}>{item.mileage.toLocaleString()} miles</Text>
              </View>
            )}
          </View>

          <View style={styles.vehicleStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: item.isActive ? theme.colors.primary : theme.colors.outline }]} />
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="car-off" size={64} color={theme.colors.outline} />
      <Text style={styles.emptyTitle}>No vehicles added</Text>
      <Text style={styles.emptySubtitle}>
        Add your first vehicle to start tracking maintenance and parts
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('AddVehicle' as never)}
        style={styles.emptyButton}
      >
        Add Your First Vehicle
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.vehicleList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddVehicle' as never)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  vehicleList: {
    padding: 16,
  },
  vehicleCard: {
    marginBottom: 12,
    elevation: 2,
  },
  vehicleContent: {
    padding: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  vehicleDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
  },
  vehicleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default VehicleListScreen;