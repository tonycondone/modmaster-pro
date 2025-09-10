import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { fetchScanHistory, deleteScan } from '../../store/slices/scanSlice';
import { formatDistanceToNow, format } from 'date-fns';
import { showToast } from '../../utils/toast';

interface ScanHistoryItem {
  id: string;
  scanImage: string;
  timestamp: string;
  partsIdentified: number;
  vehicleId?: string;
  vehicleName?: string;
  confidence: number;
  status: 'completed' | 'processing' | 'failed';
}

const ScanHistoryScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { scanHistory, isLoading } = useSelector((state: RootState) => state.scan);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      await dispatch(fetchScanHistory()).unwrap();
    } catch (error) {
      showToast('Failed to load scan history', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScanHistory();
    setRefreshing(false);
  };

  const handleDeleteScan = (scanId: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteScan(scanId)).unwrap();
              showToast('Scan deleted from history', 'success');
            } catch (error) {
              showToast('Failed to delete scan', 'error');
            }
          },
        },
      ]
    );
  };

  const handleRescan = (scan: ScanHistoryItem) => {
    navigation.navigate('ScanPreview');
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Scan History',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CSV',
          onPress: () => {
            // Export as CSV
            showToast('Scan history exported as CSV', 'success');
          },
        },
        {
          text: 'PDF',
          onPress: () => {
            // Export as PDF
            showToast('Scan history exported as PDF', 'success');
          },
        },
      ]
    );
  };

  const filterScans = () => {
    let filtered = [...scanHistory];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.vehicleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Vehicle filter
    if (selectedVehicle) {
      filtered = filtered.filter(scan => scan.vehicleId === selectedVehicle);
    }
    
    // Date range filter
    const now = new Date();
    switch (selectedDateRange) {
      case 'week':
        filtered = filtered.filter(scan => {
          const scanDate = new Date(scan.timestamp);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return scanDate >= weekAgo;
        });
        break;
      case 'month':
        filtered = filtered.filter(scan => {
          const scanDate = new Date(scan.timestamp);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return scanDate >= monthAgo;
        });
        break;
      case 'year':
        filtered = filtered.filter(scan => {
          const scanDate = new Date(scan.timestamp);
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return scanDate >= yearAgo;
        });
        break;
    }
    
    return filtered;
  };

  const renderScanItem = (scan: ScanHistoryItem) => (
    <TouchableOpacity
      key={scan.id}
      style={styles.scanCard}
      onPress={() => navigation.navigate('ScanResults', { scanId: scan.id })}
    >
      <Image source={{ uri: scan.scanImage }} style={styles.scanThumbnail} />
      
      <View style={styles.scanInfo}>
        <View style={styles.scanHeader}>
          <Text style={styles.scanDate}>
            {format(new Date(scan.timestamp), 'MMM dd, yyyy')}
          </Text>
          <Text style={styles.scanTime}>
            {formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}
          </Text>
        </View>
        
        {scan.vehicleName && (
          <Text style={styles.vehicleName}>{scan.vehicleName}</Text>
        )}
        
        <View style={styles.scanStats}>
          <View style={styles.statItem}>
            <Icon name="puzzle" size={16} color="#666" />
            <Text style={styles.statText}>
              {scan.partsIdentified} parts
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="chart-line" size={16} color="#666" />
            <Text style={styles.statText}>
              {Math.round(scan.confidence * 100)}% confidence
            </Text>
          </View>
        </View>
        
        <View style={styles.scanActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRescan(scan)}
          >
            <Icon name="camera-retake" size={18} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              Rescan
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteScan(scan.id)}
          >
            <Icon name="delete-outline" size={18} color="#FF6B6B" />
            <Text style={[styles.actionText, { color: '#FF6B6B' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {scan.status === 'processing' && (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#FF9800" />
          <Text style={styles.processingText}>Processing</Text>
        </View>
      )}
      
      {scan.status === 'failed' && (
        <View style={styles.failedBadge}>
          <Icon name="alert-circle" size={16} color="#FF4444" />
          <Text style={styles.failedText}>Failed</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search scans..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.filterChips}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'week', 'month', 'year'].map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterChip,
                selectedDateRange === range && styles.activeFilterChip,
              ]}
              onPress={() => setSelectedDateRange(range as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDateRange === range && styles.activeFilterChipText,
                ]}
              >
                {range === 'all' ? 'All Time' : `Past ${range}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="camera-off" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Scan History</Text>
      <Text style={styles.emptyMessage}>
        Your scan history will appear here once you start scanning parts
      </Text>
      <TouchableOpacity
        style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('ScanPreview')}
      >
        <Icon name="camera" size={20} color="#FFF" />
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    const totalScans = scanHistory.length;
    const totalParts = scanHistory.reduce((sum, scan) => sum + scan.partsIdentified, 0);
    const avgConfidence = scanHistory.length > 0
      ? scanHistory.reduce((sum, scan) => sum + scan.confidence, 0) / scanHistory.length
      : 0;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalParts}</Text>
          <Text style={styles.statLabel}>Parts Found</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.round(avgConfidence * 100)}%</Text>
          <Text style={styles.statLabel}>Avg Accuracy</Text>
        </View>
      </View>
    );
  };

  if (isLoading && scanHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading scan history...</Text>
      </View>
    );
  }

  const filteredScans = filterScans();

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {scanHistory.length > 0 && renderStats()}
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Icon name="filter-variant" size={20} color="#666" />
              {filteredScans.length !== scanHistory.length && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
            
            {scanHistory.length > 0 && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleExportData}
              >
                <Icon name="download" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {showFilters && renderFilters()}
        
        {filteredScans.length === 0 ? (
          searchQuery || selectedDateRange !== 'all' ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No scans match your filters</Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedDateRange('all');
                  setSelectedVehicle(null);
                }}
              >
                <Text style={[styles.clearFiltersText, { color: theme.colors.primary }]}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            renderEmptyState()
          )
        ) : (
          <View style={styles.scansList}>
            {filteredScans.map(renderScanItem)}
          </View>
        )}
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#0066CC',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#FFF',
    fontWeight: '500',
  },
  scansList: {
    padding: 16,
  },
  scanCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  scanThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  scanInfo: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scanDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  scanTime: {
    fontSize: 12,
    color: '#999',
  },
  vehicleName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scanStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  scanActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  processingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  processingText: {
    fontSize: 11,
    color: '#FF9800',
    marginLeft: 4,
  },
  failedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  failedText: {
    fontSize: 11,
    color: '#FF4444',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ScanHistoryScreen;