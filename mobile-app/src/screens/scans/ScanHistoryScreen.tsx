<<<<<<< HEAD
 
=======
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Divider,
  Surface,
  Text,
  ActivityIndicator,
  List,
  Avatar,
  IconButton,
  Menu,
  Searchbar,
  FAB,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchUserScans, deleteScan, retryScan } from '@/store/slices/scanSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ScanHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { scans, loading, error } = useSelector((state: RootState) => state.scans);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      await dispatch(fetchUserScans() as any);
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleDeleteScan = (scanId: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteScan(scanId) as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete scan');
            }
          },
        },
      ]
    );
  };

  const handleRetryScan = async (scanId: string) => {
    try {
      await dispatch(retryScan(scanId) as any);
      Alert.alert('Success', 'Scan processing restarted');
    } catch (error) {
      Alert.alert('Error', 'Failed to retry scan');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'processing':
        return 'clock';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle';
  };

  const filteredScans = scans.filter(scan => {
    const matchesSearch = !searchQuery || 
      scan.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getVehicleName(scan.vehicleId).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || scan.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const filterOptions = [
    { label: 'All Scans', value: 'all', count: scans.length },
    { label: 'Completed', value: 'completed', count: scans.filter(s => s.status === 'completed').length },
    { label: 'Processing', value: 'processing', count: scans.filter(s => s.status === 'processing').length },
    { label: 'Failed', value: 'failed', count: scans.filter(s => s.status === 'failed').length },
  ];

  if (loading && scans.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading scan history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Search scans..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filterOptions.map((option) => (
            <Chip
              key={option.value}
              mode={filter === option.value ? 'flat' : 'outlined'}
              onPress={() => setFilter(option.value as any)}
              style={styles.filterChip}
            >
              {option.label} ({option.count})
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {/* Scan List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredScans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="camera-off" size={64} color="#ccc" />
            <Title style={styles.emptyTitle}>
              {searchQuery || filter !== 'all' ? 'No scans found' : 'No scans yet'}
            </Title>
            <Paragraph style={styles.emptyDescription}>
              {searchQuery || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start scanning parts to see your history here'
              }
            </Paragraph>
            {!searchQuery && filter === 'all' && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Scan' as never)}
                style={styles.scanButton}
              >
                Start Scanning
              </Button>
            )}
          </View>
        ) : (
          filteredScans.map((scan) => (
            <Card key={scan.id} style={styles.scanCard}>
              <Card.Content>
                <View style={styles.scanHeader}>
                  <View style={styles.scanInfo}>
                    <Text style={styles.scanDate}>
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.scanTime}>
                      {new Date(scan.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  <View style={styles.scanActions}>
                    <Chip
                      icon={getStatusIcon(scan.status)}
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusColor(scan.status) + '20' }
                      ]}
                      textStyle={{ color: getStatusColor(scan.status) }}
                    >
                      {scan.status}
                    </Chip>
                    
                    <Menu
                      visible={menuVisible === scan.id}
                      onDismiss={() => setMenuVisible(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => setMenuVisible(scan.id)}
                        />
                      }
                    >
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          navigation.navigate('ScanDetails' as never, { scanId: scan.id } as never);
                        }}
                        title="View Details"
                        leadingIcon="eye"
                      />
                      {scan.status === 'failed' && (
                        <Menu.Item
                          onPress={() => {
                            setMenuVisible(null);
                            handleRetryScan(scan.id);
                          }}
                          title="Retry Scan"
                          leadingIcon="refresh"
                        />
                      )}
                      <Divider />
                      <Menu.Item
                        onPress={() => {
                          setMenuVisible(null);
                          handleDeleteScan(scan.id);
                        }}
                        title="Delete"
                        leadingIcon="delete"
                      />
                    </Menu>
                  </View>
                </View>

                <List.Item
                  title={scan.vehicleId ? getVehicleName(scan.vehicleId) : 'No vehicle selected'}
                  description={scan.notes || 'No notes'}
                  left={(props) => (
                    <Avatar.Image
                      {...props}
                      source={{ uri: scan.imageUrl }}
                      size={50}
                    />
                  )}
                  style={styles.scanDetails}
                  onPress={() => navigation.navigate('ScanDetails' as never, { scanId: scan.id } as never)}
                />

                {/* Results Summary */}
                {scan.status === 'completed' && scan.results && (
                  <View style={styles.resultsContainer}>
                    <Divider style={styles.resultsDivider} />
                    <View style={styles.resultsHeader}>
                      <Text style={styles.resultsTitle}>Parts Detected</Text>
                      <Text style={styles.resultsCount}>
                        {scan.results.parts?.length || 0} parts
                      </Text>
                    </View>
                    
                    {scan.results.parts?.slice(0, 2).map((part: any, index: number) => (
                      <View key={index} style={styles.partItem}>
                        <Text style={styles.partName}>{part.name}</Text>
                        <Text style={styles.partConfidence}>
                          {Math.round(part.confidence * 100)}% confidence
                        </Text>
                      </View>
                    ))}
                    
                    {scan.results.parts?.length > 2 && (
                      <Text style={styles.moreResults}>
                        +{scan.results.parts.length - 2} more parts
                      </Text>
                    )}
                  </View>
                )}

                {/* Error Display */}
                {scan.status === 'failed' && scan.error && (
                  <View style={styles.errorContainer}>
                    <Divider style={styles.resultsDivider} />
                    <View style={styles.errorContent}>
                      <Icon name="alert-circle" size={20} color="#F44336" />
                      <Text style={styles.errorText}>{scan.error}</Text>
                    </View>
                  </View>
                )}

                {/* Processing Indicator */}
                {scan.status === 'processing' && (
                  <View style={styles.processingContainer}>
                    <Divider style={styles.resultsDivider} />
                    <View style={styles.processingContent}>
                      <ActivityIndicator size="small" color="#FF9800" />
                      <Text style={styles.processingText}>
                        Processing scan... This may take a few minutes.
                      </Text>
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="camera"
        label="New Scan"
        onPress={() => navigation.navigate('Scan' as never)}
      />
    </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  searchbar: {
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  scanButton: {
    minWidth: 150,
  },
  scanCard: {
    margin: 16,
    marginBottom: 8,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scanInfo: {
    flex: 1,
  },
  scanDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  scanTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scanActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: 8,
  },
  scanDetails: {
    paddingHorizontal: 0,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsDivider: {
    marginVertical: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 12,
    color: '#666',
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  partName: {
    fontSize: 13,
    flex: 1,
  },
  partConfidence: {
    fontSize: 12,
    color: '#4CAF50',
  },
  moreResults: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 8,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  processingContainer: {
    marginTop: 8,
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 13,
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
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

export default ScanHistoryScreen;
>>>>>>> v.3.0
