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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip, SegmentedButtons, FAB } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  total: number;
  itemCount: number;
  items: Array<{
    id: string;
    name: string;
    image: string;
  }>;
}

// Mock data - TODO: Replace with actual API call
const mockOrders: OrderSummary[] = [
  {
    id: '1',
    orderNumber: 'ORD-123456',
    status: 'delivered',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    total: 115.25,
    itemCount: 3,
    items: [
      {
        id: '1',
        name: 'Premium Brake Pads Set',
        image: 'https://example.com/brake-pads.jpg',
      },
      {
        id: '2',
        name: 'Engine Oil Filter',
        image: 'https://example.com/oil-filter.jpg',
      },
    ],
  },
  {
    id: '2',
    orderNumber: 'ORD-123457',
    status: 'shipped',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    total: 89.99,
    itemCount: 1,
    items: [
      {
        id: '3',
        name: 'Air Filter',
        image: 'https://example.com/air-filter.jpg',
      },
    ],
  },
  {
    id: '3',
    orderNumber: 'ORD-123458',
    status: 'processing',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    total: 245.50,
    itemCount: 5,
    items: [
      {
        id: '4',
        name: 'Spark Plugs Set',
        image: 'https://example.com/spark-plugs.jpg',
      },
      {
        id: '5',
        name: 'Battery',
        image: 'https://example.com/battery.jpg',
      },
    ],
  },
];

const OrderHistoryScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setPage(1);
      
      // TODO: Replace with actual API call
      // const response = await apiService.getOrders({ page: 1, filter });
      // setOrders(response.data.orders);
      // setHasMore(response.data.hasMore);
      
      // Using mock data for now
      let filteredOrders = [...mockOrders];
      if (filter === 'active') {
        filteredOrders = filteredOrders.filter(o => 
          ['pending', 'processing', 'shipped'].includes(o.status)
        );
      } else if (filter === 'completed') {
        filteredOrders = filteredOrders.filter(o => 
          ['delivered', 'cancelled'].includes(o.status)
        );
      }
      setOrders(filteredOrders);
      setHasMore(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [filter]);

  const loadMoreOrders = async () => {
    if (!hasMore || loading) return;
    
    try {
      // TODO: Implement pagination
      // const response = await apiService.getOrders({ page: page + 1, filter });
      // setOrders([...orders, ...response.data.orders]);
      // setPage(page + 1);
      // setHasMore(response.data.hasMore);
    } catch (error) {
      showToast('Failed to load more orders', 'error');
    }
  };

  // Handlers
  const handleOrderPress = (order: OrderSummary) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const handleReorder = (order: OrderSummary) => {
    Alert.alert(
      'Reorder Items',
      `Add all ${order.itemCount} items from order ${order.orderNumber} to your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Cart',
          onPress: async () => {
            // TODO: Implement reorder functionality
            showToast('Items added to cart', 'success');
            navigation.navigate('Cart');
          },
        },
      ]
    );
  };

  const handleTrackOrder = (order: OrderSummary) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const getStatusColor = (status: OrderSummary['status']) => {
    switch (status) {
      case 'pending':
        return '#FF6F00';
      case 'processing':
        return '#0066CC';
      case 'shipped':
        return '#0066CC';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: OrderSummary['status']) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'processing':
        return 'package-variant';
      case 'shipped':
        return 'truck-delivery';
      case 'delivered':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderOrder = ({ item }: { item: OrderSummary }) => (
    <TouchableOpacity onPress={() => handleOrderPress(item)}>
      <Card style={styles.orderCard}>
        <Card.Content>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
              <Text style={styles.orderDate}>
                {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </Text>
            </View>
            <Chip
              icon={getStatusIcon(item.status)}
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={[styles.statusChipText, { color: getStatusColor(item.status) }]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Chip>
          </View>

          {/* Order Items Preview */}
          <View style={styles.itemsPreview}>
            <View style={styles.itemImages}>
              {item.items.slice(0, 3).map((product, index) => (
                <Image
                  key={product.id}
                  source={{ uri: product.image }}
                  style={[
                    styles.itemImage,
                    index > 0 && { marginLeft: -12 },
                    { zIndex: 3 - index },
                  ]}
                  defaultSource={require('../../../assets/images/placeholder.png')}
                />
              ))}
              {item.itemCount > 3 && (
                <View style={[styles.moreItems, { marginLeft: -12 }]}>
                  <Text style={styles.moreItemsText}>+{item.itemCount - 3}</Text>
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemCount}>{item.itemCount} items</Text>
              <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Order Actions */}
          <View style={styles.orderActions}>
            {item.status === 'delivered' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReorder(item)}
              >
                <MaterialCommunityIcons name="cart-plus" size={16} color="#0066CC" />
                <Text style={styles.actionText}>Reorder</Text>
              </TouchableOpacity>
            ) : item.status === 'shipped' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleTrackOrder(item)}
              >
                <MaterialCommunityIcons name="truck-delivery" size={16} color="#0066CC" />
                <Text style={styles.actionText}>Track</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOrderPress(item)}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#0066CC" />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

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
  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as typeof filter)}
          buttons={[
            { value: 'all', label: 'All Orders' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ]}
          style={styles.filterButtons}
        />
      </View>

      {/* Orders List */}
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant-closed" size={80} color="#999" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' 
              ? "When you place an order, it will appear here"
              : `No ${filter} orders found`}
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('BrowseParts')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && orders.length > 0 ? (
              <ActivityIndicator size="small" color="#0066CC" style={styles.loadingMore} />
            ) : null
          }
        />
      )}

      {/* FAB for browsing parts */}
      <FAB
        style={styles.fab}
        icon="store"
        onPress={() => navigation.navigate('BrowseParts')}
        label="Shop Parts"
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
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButtons: {
    // Style handled by SegmentedButtons component
  },
  ordersList: {
    padding: 16,
    paddingBottom: 100,
  },
  orderCard: {
    marginBottom: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#F5F5F5',
  },
  moreItems: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreItemsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  itemInfo: {
    alignItems: 'flex-end',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  shopButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  shopButtonText: {
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