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
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  FAB,
  Chip,
  SegmentedButtons,
  List,
  Button,
  RadioButton,
  HelperText,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addMaintenanceRecord,
  getMaintenanceHistory,
  fetchVehicleById,
} from '../../store/slices/vehicleSlice';
import { showToast } from '../../utils/toast';
import { format, formatDistanceToNow, addDays, addMonths } from 'date-fns';

type RouteParams = {
  Maintenance: {
    vehicleId: string;
  };
};

type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_service'
  | 'air_filter'
  | 'transmission'
  | 'coolant'
  | 'battery'
  | 'other';

interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  date: string;
  mileage: number;
  cost?: number;
  notes?: string;
  nextDue?: {
    date?: string;
    mileage?: number;
  };
  provider?: string;
  receiptUrl?: string;
}

const maintenanceTypes = [
  { value: 'oil_change', label: 'Oil Change', icon: 'oil', interval: { months: 6, miles: 5000 } },
  { value: 'tire_rotation', label: 'Tire Rotation', icon: 'tire', interval: { months: 6, miles: 6000 } },
  { value: 'brake_service', label: 'Brake Service', icon: 'car-brake-abs', interval: { months: 12, miles: 20000 } },
  { value: 'air_filter', label: 'Air Filter', icon: 'air-filter', interval: { months: 12, miles: 15000 } },
  { value: 'transmission', label: 'Transmission', icon: 'car-shift-pattern', interval: { months: 24, miles: 30000 } },
  { value: 'coolant', label: 'Coolant Flush', icon: 'coolant-temperature', interval: { months: 24, miles: 30000 } },
  { value: 'battery', label: 'Battery Check', icon: 'car-battery', interval: { months: 12, miles: 0 } },
  { value: 'other', label: 'Other', icon: 'wrench', interval: { months: 0, miles: 0 } },
];

const MaintenanceScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'cost'>('date');
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'oil_change' as MaintenanceType,
    date: new Date(),
    mileage: '',
    cost: '',
    provider: '',
    notes: '',
    scheduleNext: true,
  });

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const vehicle = useAppSelector(state => state.vehicles.currentVehicle);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'Maintenance'>>();
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
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance data');
      Alert.alert('Error', 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [vehicleId]);

  // Calculate statistics
  const statistics = React.useMemo(() => {
    const totalCost = maintenanceHistory.reduce((sum, record) => sum + (record.cost || 0), 0);
    const thisYearCost = maintenanceHistory
      .filter(record => new Date(record.date).getFullYear() === new Date().getFullYear())
      .reduce((sum, record) => sum + (record.cost || 0), 0);
    const overdueTasks = maintenanceHistory.filter(record => {
      if (!record.nextDue) return false;
      if (record.nextDue.date && new Date(record.nextDue.date) < new Date()) return true;
      if (record.nextDue.mileage && vehicle?.mileage && vehicle.mileage > record.nextDue.mileage) return true;
      return false;
    }).length;

    return { totalCost, thisYearCost, overdueTasks };
  }, [maintenanceHistory, vehicle]);

  // Filter and sort maintenance records
  const filteredAndSortedRecords = React.useMemo(() => {
    let filtered = [...maintenanceHistory];

    // Apply filters
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(record => record.nextDue);
        break;
      case 'overdue':
        filtered = filtered.filter(record => {
          if (!record.nextDue) return false;
          if (record.nextDue.date && new Date(record.nextDue.date) < new Date()) return true;
          if (record.nextDue.mileage && vehicle?.mileage && vehicle.mileage > record.nextDue.mileage) return true;
          return false;
        });
        break;
      case 'completed':
        filtered = filtered.filter(record => !record.nextDue);
        break;
    }

    // Sort records
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'type':
          return a.type.localeCompare(b.type);
        case 'cost':
          return (b.cost || 0) - (a.cost || 0);
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [maintenanceHistory, filter, sortBy, vehicle]);

  // Handlers
  const handleAddMaintenance = () => {
    setFormData({
      type: 'oil_change',
      date: new Date(),
      mileage: vehicle?.mileage?.toString() || '',
      cost: '',
      provider: '',
      notes: '',
      scheduleNext: true,
    });
    setModalVisible(true);
  };

  const handleSaveMaintenance = async () => {
    try {
      // Validation
      if (!formData.mileage) {
        Alert.alert('Error', 'Please enter the current mileage');
        return;
      }

      const maintenanceType = maintenanceTypes.find(t => t.value === formData.type);
      let nextDue;

      if (formData.scheduleNext && maintenanceType) {
        nextDue = {
          date: maintenanceType.interval.months
            ? addMonths(formData.date, maintenanceType.interval.months).toISOString()
            : undefined,
          mileage: maintenanceType.interval.miles
            ? parseInt(formData.mileage) + maintenanceType.interval.miles
            : undefined,
        };
      }

      const record = {
        type: formData.type,
        date: formData.date.toISOString(),
        mileage: parseInt(formData.mileage),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        provider: formData.provider || undefined,
        notes: formData.notes || undefined,
        nextDue,
      };

      await dispatch(addMaintenanceRecord({ vehicleId, record })).unwrap();
      showToast('Maintenance record added successfully', 'success');
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add maintenance record');
    }
  };

  const handleExportHistory = () => {
    // TODO: Implement export functionality
    showToast('Export feature coming soon', 'info');
  };

  const renderMaintenanceItem = (record: MaintenanceRecord) => {
    const maintenanceType = maintenanceTypes.find(t => t.value === record.type);
    const isOverdue = record.nextDue && (
      (record.nextDue.date && new Date(record.nextDue.date) < new Date()) ||
      (record.nextDue.mileage && vehicle?.mileage && vehicle.mileage > record.nextDue.mileage)
    );

    return (
      <Card key={record.id} style={[styles.maintenanceCard, isOverdue && styles.overdueCard]}>
        <Card.Content>
          <View style={styles.maintenanceHeader}>
            <View style={styles.maintenanceTypeContainer}>
              <MaterialCommunityIcons
                name={maintenanceType?.icon as any || 'wrench'}
                size={24}
                color={isOverdue ? '#FF6F00' : '#0066CC'}
              />
              <View style={styles.maintenanceInfo}>
                <Text style={styles.maintenanceType}>{maintenanceType?.label || 'Other'}</Text>
                <Text style={styles.maintenanceDate}>
                  {format(new Date(record.date), 'MMM d, yyyy')}
                  {' • '}
                  {record.mileage.toLocaleString()} mi
                </Text>
              </View>
            </View>
            {record.cost && (
              <Text style={styles.maintenanceCost}>${record.cost.toFixed(2)}</Text>
            )}
          </View>

          {record.provider && (
            <View style={styles.providerContainer}>
              <MaterialCommunityIcons name="store" size={16} color="#666" />
              <Text style={styles.providerText}>{record.provider}</Text>
            </View>
          )}

          {record.notes && (
            <Text style={styles.notesText}>{record.notes}</Text>
          )}

          {record.nextDue && (
            <View style={[styles.nextDueContainer, isOverdue && styles.overdueContainer]}>
              <MaterialCommunityIcons
                name={isOverdue ? 'alert-circle' : 'clock-outline'}
                size={16}
                color={isOverdue ? '#FF6F00' : '#666'}
              />
              <Text style={[styles.nextDueText, isOverdue && styles.overdueText]}>
                Next due: {' '}
                {record.nextDue.date && format(new Date(record.nextDue.date), 'MMM d, yyyy')}
                {record.nextDue.date && record.nextDue.mileage && ' or '}
                {record.nextDue.mileage && `${record.nextDue.mileage.toLocaleString()} mi`}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
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
  if (loading && maintenanceHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading maintenance history...</Text>
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
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="currency-usd" size={24} color="#0066CC" />
              <Text style={styles.statValue}>${statistics.totalCost.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>${statistics.thisYearCost.toFixed(0)}</Text>
              <Text style={styles.statLabel}>This Year</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, statistics.overdueTasks > 0 && styles.overdueStatCard]}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color={statistics.overdueTasks > 0 ? '#FF6F00' : '#4CAF50'}
              />
              <Text style={[styles.statValue, statistics.overdueTasks > 0 && styles.overdueStatValue]}>
                {statistics.overdueTasks}
              </Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Upcoming Maintenance */}
        {statistics.overdueTasks > 0 && (
          <Card style={styles.alertCard}>
            <Card.Content>
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons name="alert" size={24} color="#FF6F00" />
                <Text style={styles.alertTitle}>Maintenance Required</Text>
              </View>
              <Text style={styles.alertText}>
                You have {statistics.overdueTasks} overdue maintenance item{statistics.overdueTasks > 1 ? 's' : ''}.
                Keep your vehicle in top condition by scheduling service soon.
              </Text>
              <Button
                mode="contained"
                onPress={() => setFilter('overdue')}
                style={styles.alertButton}
                buttonColor="#FF6F00"
              >
                View Overdue Items
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Filters and Sort */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={filter}
              onValueChange={(value) => setFilter(value as typeof filter)}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'completed', label: 'Completed' },
              ]}
              style={styles.filterButtons}
            />
          </ScrollView>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportHistory}>
            <MaterialCommunityIcons name="download" size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>

        {/* Maintenance History */}
        {filteredAndSortedRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-off" size={64} color="#999" />
            <Text style={styles.emptyStateTitle}>No maintenance records</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'Start tracking your vehicle maintenance'
                : `No ${filter} maintenance records found`}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity style={styles.addFirstButton} onPress={handleAddMaintenance}>
                <Text style={styles.addFirstButtonText}>Add First Record</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {filteredAndSortedRecords.map(renderMaintenanceItem)}
          </View>
        )}
      </ScrollView>

      {/* Add Maintenance Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Maintenance Record</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Maintenance Type */}
              <Text style={styles.inputLabel}>Type of Maintenance</Text>
              <RadioButton.Group
                onValueChange={(value) => setFormData({ ...formData, type: value as MaintenanceType })}
                value={formData.type}
              >
                {maintenanceTypes.map((type) => (
                  <RadioButton.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                    style={styles.radioItem}
                  />
                ))}
              </RadioButton.Group>

              {/* Date */}
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                <Text style={styles.dateButtonText}>
                  {format(formData.date, 'MMMM d, yyyy')}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setFormData({ ...formData, date });
                  }}
                  maximumDate={new Date()}
                />
              )}

              {/* Mileage */}
              <Text style={styles.inputLabel}>Current Mileage</Text>
              <TextInput
                style={styles.input}
                value={formData.mileage}
                onChangeText={(text) => setFormData({ ...formData, mileage: text })}
                keyboardType="numeric"
                placeholder="Enter current mileage"
                placeholderTextColor="#999"
              />

              {/* Cost */}
              <Text style={styles.inputLabel}>Cost (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.cost}
                onChangeText={(text) => setFormData({ ...formData, cost: text })}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#999"
              />

              {/* Provider */}
              <Text style={styles.inputLabel}>Service Provider (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.provider}
                onChangeText={(text) => setFormData({ ...formData, provider: text })}
                placeholder="e.g., Joe's Auto Shop"
                placeholderTextColor="#999"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Additional notes..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              {/* Schedule Next */}
              <View style={styles.scheduleContainer}>
                <RadioButton
                  value="schedule"
                  status={formData.scheduleNext ? 'checked' : 'unchecked'}
                  onPress={() => setFormData({ ...formData, scheduleNext: !formData.scheduleNext })}
                />
                <Text style={styles.scheduleText}>Schedule next maintenance reminder</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveMaintenance}
                style={styles.modalButton}
                buttonColor="#0066CC"
              >
                Save Record
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddMaintenance}
        label="Add Record"
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
    paddingBottom: 100,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  overdueStatCard: {
    backgroundColor: '#FFF3E0',
  },
  overdueStatValue: {
    color: '#FF6F00',
  },
  alertCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF3E0',
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6F00',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  alertButton: {
    marginTop: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButtons: {
    flex: 1,
  },
  exportButton: {
    marginLeft: 12,
    padding: 8,
  },
  historyContainer: {
    paddingHorizontal: 16,
  },
  maintenanceCard: {
    marginBottom: 12,
    elevation: 2,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6F00',
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  maintenanceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  maintenanceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  maintenanceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  maintenanceDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  maintenanceCost: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  providerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  nextDueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  overdueContainer: {
    backgroundColor: '#FFF3E0',
  },
  nextDueText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  overdueText: {
    color: '#FF6F00',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalScrollView: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  radioItem: {
    paddingVertical: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  scheduleText: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
});