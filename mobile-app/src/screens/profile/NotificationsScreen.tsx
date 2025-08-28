import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  SectionList,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import { showToast } from '../../utils/toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'maintenance' | 'order' | 'scan' | 'promotion' | 'system';
  read: boolean;
  timestamp: string;
  metadata?: any;
}

const NotificationsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Mock notifications data - replace with actual API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Maintenance Due',
          message: 'Oil change due for your 2021 Honda Civic',
          type: 'maintenance',
          read: false,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metadata: { vehicleId: '1', maintenanceType: 'oil_change' }
        },
        {
          id: '2',
          title: 'Order Shipped',
          message: 'Your brake pad order has been shipped',
          type: 'order',
          read: true,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          metadata: { orderId: '12345', trackingNumber: 'TRK123456' }
        },
        {
          id: '3',
          title: 'Scan Complete',
          message: 'We identified 3 parts from your scan',
          type: 'scan',
          read: false,
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          metadata: { scanId: '789', partsCount: 3 }
        },
        {
          id: '4',
          title: 'Special Offer',
          message: '20% off on all brake components this week',
          type: 'promotion',
          read: true,
          timestamp: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: '5',
          title: 'System Update',
          message: 'New features added to the app',
          type: 'system',
          read: true,
          timestamp: new Date(Date.now() - 604800000).toISOString(),
        },
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // API call to mark as read
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      showToast('Failed to mark as read', 'error');
    }
  };

  const markAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: async () => {
            try {
              // API call to mark all as read
              setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
              );
              showToast('All notifications marked as read', 'success');
            } catch (error) {
              showToast('Failed to mark all as read', 'error');
            }
          },
        },
      ]
    );
  };

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // API call to delete notification
              setNotifications(prev =>
                prev.filter(n => n.id !== notificationId)
              );
              showToast('Notification deleted', 'success');
            } catch (error) {
              showToast('Failed to delete notification', 'error');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'maintenance':
        if (notification.metadata?.vehicleId) {
          navigation.navigate('VehicleDetails', { vehicleId: notification.metadata.vehicleId });
        }
        break;
      case 'order':
        if (notification.metadata?.orderId) {
          navigation.navigate('OrderDetails', { orderId: notification.metadata.orderId });
        }
        break;
      case 'scan':
        if (notification.metadata?.scanId) {
          navigation.navigate('ScanResults', { scanId: notification.metadata.scanId });
        }
        break;
      case 'promotion':
        navigation.navigate('Browse');
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return 'wrench';
      case 'order':
        return 'package-variant';
      case 'scan':
        return 'camera';
      case 'promotion':
        return 'tag';
      case 'system':
        return 'information';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'maintenance':
        return '#FF9800';
      case 'order':
        return '#4CAF50';
      case 'scan':
        return '#2196F3';
      case 'promotion':
        return '#E91E63';
      case 'system':
        return '#9C27B0';
      default:
        return theme.colors.primary;
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;
    
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(n => n.type === selectedFilter);
    }
    
    if (showUnreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    // Group by date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const sections = [];
    
    const todayNotifications = filtered.filter(n => {
      const date = new Date(n.timestamp);
      return date.toDateString() === today.toDateString();
    });
    
    if (todayNotifications.length > 0) {
      sections.push({ title: 'Today', data: todayNotifications });
    }
    
    const yesterdayNotifications = filtered.filter(n => {
      const date = new Date(n.timestamp);
      return date.toDateString() === yesterday.toDateString();
    });
    
    if (yesterdayNotifications.length > 0) {
      sections.push({ title: 'Yesterday', data: yesterdayNotifications });
    }
    
    const thisWeekNotifications = filtered.filter(n => {
      const date = new Date(n.timestamp);
      return date > lastWeek && 
             date.toDateString() !== today.toDateString() && 
             date.toDateString() !== yesterday.toDateString();
    });
    
    if (thisWeekNotifications.length > 0) {
      sections.push({ title: 'This Week', data: thisWeekNotifications });
    }
    
    const olderNotifications = filtered.filter(n => {
      const date = new Date(n.timestamp);
      return date <= lastWeek;
    });
    
    if (olderNotifications.length > 0) {
      sections.push({ title: 'Older', data: olderNotifications });
    }
    
    return sections;
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => deleteNotification(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
        <Icon name={getNotificationIcon(item.type)} size={24} color="#FFFFFF" />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        
        <Text style={styles.notificationTime}>
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => deleteNotification(item.id)}
      >
        <Icon name="dots-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="bell-off-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyMessage}>
        {showUnreadOnly
          ? 'You have no unread notifications'
          : selectedFilter !== 'all'
          ? `No ${selectedFilter} notifications`
          : 'You have no notifications yet'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerActions}>
        <View style={styles.filterToggle}>
          <Text style={styles.filterLabel}>Unread only</Text>
          <Switch
            value={showUnreadOnly}
            onValueChange={setShowUnreadOnly}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor={showUnreadOnly ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
        
        {notifications.some(n => !n.read) && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Icon name="check-all" size={20} color={theme.colors.primary} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'maintenance', 'order', 'scan', 'promotion', 'system'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.activeFilterChip
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter && styles.activeFilterChipText
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const sections = filterNotifications();

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : null}
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#666',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  activeFilterChip: {
    backgroundColor: '#0066CC',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  unreadNotification: {
    backgroundColor: '#F0F7FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066CC',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  moreButton: {
    padding: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
    paddingHorizontal: 32,
  },
});

export default NotificationsScreen;