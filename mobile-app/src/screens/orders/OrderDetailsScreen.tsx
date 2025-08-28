import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  Button,
  Divider,
  ProgressBar,
  Chip,
  Menu,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';

type RouteParams = {
  OrderDetails: {
    orderId: string;
  };
};

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    partId: string;
    partName: string;
    partImage: string;
    partNumber: string;
    brand: string;
    price: number;
    quantity: number;
  }>;
  shipping: {
    address: {
      fullName: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone: string;
    };
    method: string;
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
  };
  payment: {
    method: string;
    last4?: string;
    brand?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
  };
  summary: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  timeline: Array<{
    id: string;
    status: string;
    description: string;
    timestamp: string;
  }>;
}

// Mock order data - TODO: Replace with actual API call
const mockOrder: Order = {
  id: '1',
  orderNumber: 'ORD-123456',
  status: 'shipped',
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  items: [
    {
      id: '1',
      partId: '1',
      partName: 'Premium Brake Pads Set - Front',
      partImage: 'https://example.com/brake-pads.jpg',
      partNumber: 'BP-12345',
      brand: 'Wagner',
      price: 89.99,
      quantity: 1,
    },
    {
      id: '2',
      partId: '2',
      partName: 'Engine Oil Filter',
      partImage: 'https://example.com/oil-filter.jpg',
      partNumber: 'OF-67890',
      brand: 'Bosch',
      price: 12.99,
      quantity: 2,
    },
  ],
  shipping: {
    address: {
      fullName: 'John Doe',
      addressLine1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
      phone: '(555) 123-4567',
    },
    method: 'Standard Shipping',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  payment: {
    method: 'card',
    last4: '4242',
    brand: 'Visa',
    status: 'completed',
  },
  summary: {
    subtotal: 115.97,
    shipping: 0,
    tax: 9.28,
    discount: 10.00,
    total: 115.25,
    currency: 'USD',
  },
  timeline: [
    {
      id: '1',
      status: 'Order Placed',
      description: 'Your order has been received',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      status: 'Payment Confirmed',
      description: 'Payment processed successfully',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      status: 'Order Processing',
      description: 'Preparing your items for shipment',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      status: 'Shipped',
      description: 'Your order is on the way',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

const OrderDetailsScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OrderDetails'>>();
  const { orderId } = route.params;

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await apiService.getOrderById(orderId);
      // setOrder(response.data);
      
      // Using mock data for now
      setOrder(mockOrder);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handlers
  const handleTrackShipment = () => {
    if (order?.shipping.trackingNumber && order?.shipping.carrier) {
      let url = '';
      switch (order.shipping.carrier.toLowerCase()) {
        case 'ups':
          url = `https://www.ups.com/track?tracknum=${order.shipping.trackingNumber}`;
          break;
        case 'fedex':
          url = `https://www.fedex.com/fedextrack/?tracknumbers=${order.shipping.trackingNumber}`;
          break;
        case 'usps':
          url = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.shipping.trackingNumber}`;
          break;
        default:
          url = `https://www.google.com/search?q=${order.shipping.trackingNumber}`;
      }
      Linking.openURL(url);
    }
  };

  const handleReorder = () => {
    Alert.alert(
      'Reorder Items',
      'Add all items from this order to your cart?',
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

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download
    showToast('Invoice download coming soon', 'info');
  };

  const handleReportIssue = () => {
    // TODO: Navigate to support/issue reporting
    showToast('Support feature coming soon', 'info');
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement order cancellation
            showToast('Order cancellation request submitted', 'success');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: Order['status']) => {
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

  const getStatusIcon = (status: Order['status']) => {
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

  const getProgressValue = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 0.25;
      case 'processing':
        return 0.5;
      case 'shipped':
        return 0.75;
      case 'delivered':
        return 1;
      default:
        return 0;
    }
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
  if (loading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="package-variant-closed" size={64} color="#999" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        {/* Order Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                <Text style={styles.orderDate}>
                  Placed on {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item onPress={handleDownloadInvoice} title="Download Invoice" leadingIcon="download" />
                <Menu.Item onPress={handleReportIssue} title="Report Issue" leadingIcon="alert-circle" />
                {order.status === 'pending' && (
                  <Menu.Item
                    onPress={handleCancelOrder}
                    title="Cancel Order"
                    leadingIcon="close-circle"
                    titleStyle={{ color: '#FF3B30' }}
                  />
                )}
              </Menu>
            </View>

            {/* Status Chip */}
            <Chip
              icon={getStatusIcon(order.status)}
              style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) + '20' }]}
              textStyle={[styles.statusChipText, { color: getStatusColor(order.status) }]}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Chip>

            {/* Progress Bar */}
            {order.status !== 'cancelled' && (
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={getProgressValue(order.status)}
                  color={getStatusColor(order.status)}
                  style={styles.progressBar}
                />
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Placed</Text>
                  <Text style={styles.progressLabel}>Processing</Text>
                  <Text style={styles.progressLabel}>Shipped</Text>
                  <Text style={styles.progressLabel}>Delivered</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Shipping Information */}
        {order.status === 'shipped' && order.shipping.trackingNumber && (
          <Card style={styles.trackingCard}>
            <Card.Content>
              <View style={styles.trackingHeader}>
                <MaterialCommunityIcons name="truck-delivery" size={24} color="#0066CC" />
                <Text style={styles.trackingTitle}>Shipment Tracking</Text>
              </View>
              <Text style={styles.trackingCarrier}>{order.shipping.carrier}</Text>
              <Text style={styles.trackingNumber}>{order.shipping.trackingNumber}</Text>
              {order.shipping.estimatedDelivery && (
                <Text style={styles.estimatedDelivery}>
                  Expected by {format(new Date(order.shipping.estimatedDelivery), 'EEEE, MMM d')}
                </Text>
              )}
              <Button
                mode="contained"
                onPress={handleTrackShipment}
                style={styles.trackButton}
                buttonColor="#0066CC"
                icon="open-in-new"
              >
                Track Shipment
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Order Timeline */}
        <Card style={styles.timelineCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            {order.timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                  {index < order.timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{event.status}</Text>
                  <Text style={styles.timelineDescription}>{event.description}</Text>
                  <Text style={styles.timelineDate}>
                    {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Order Items */}
        <Card style={styles.itemsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Order Items ({order.items.length})</Text>
            {order.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.orderItem}
                onPress={() => navigation.navigate('PartDetails', { partId: item.partId })}
              >
                <Image
                  source={{ uri: item.partImage }}
                  style={styles.itemImage}
                  defaultSource={require('../../../assets/images/placeholder.png')}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemBrand}>{item.brand}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.partName}
                  </Text>
                  <Text style={styles.itemPartNumber}>Part # {item.partNumber}</Text>
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>

        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.summary.subtotal.toFixed(2)}</Text>
            </View>
            {order.summary.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -${order.summary.discount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                {order.summary.shipping === 0 ? 'FREE' : `$${order.summary.shipping.toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${order.summary.tax.toFixed(2)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.summary.total.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Shipping Address */}
        <Card style={styles.addressCard}>
          <Card.Content>
            <View style={styles.addressHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
              <Text style={styles.addressTitle}>Shipping Address</Text>
            </View>
            <Text style={styles.addressText}>{order.shipping.address.fullName}</Text>
            <Text style={styles.addressText}>{order.shipping.address.addressLine1}</Text>
            {order.shipping.address.addressLine2 && (
              <Text style={styles.addressText}>{order.shipping.address.addressLine2}</Text>
            )}
            <Text style={styles.addressText}>
              {order.shipping.address.city}, {order.shipping.address.state} {order.shipping.address.postalCode}
            </Text>
            <Text style={styles.addressText}>{order.shipping.address.phone}</Text>
          </Card.Content>
        </Card>

        {/* Payment Information */}
        <Card style={styles.paymentCard}>
          <Card.Content>
            <View style={styles.paymentHeader}>
              <MaterialCommunityIcons name="credit-card" size={20} color="#666" />
              <Text style={styles.paymentTitle}>Payment Method</Text>
            </View>
            <View style={styles.paymentInfo}>
              <MaterialCommunityIcons
                name={order.payment.method === 'card' ? 'credit-card' : 'paypal'}
                size={24}
                color="#666"
              />
              <Text style={styles.paymentText}>
                {order.payment.brand || order.payment.method} {order.payment.last4 && `•••• ${order.payment.last4}`}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Reorder Button */}
        {order.status === 'delivered' && (
          <Button
            mode="contained"
            onPress={handleReorder}
            style={styles.reorderButton}
            buttonColor="#0066CC"
            icon="cart-plus"
          >
            Reorder Items
          </Button>
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
  scrollContent: {
    paddingBottom: 20,
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
  headerCard: {
    margin: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 10,
    color: '#666',
  },
  trackingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#E3F2FD',
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 8,
  },
  trackingCarrier: {
    fontSize: 14,
    color: '#666',
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#0066CC',
    marginTop: 8,
  },
  trackButton: {
    marginTop: 12,
  },
  timelineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  timelineDotActive: {
    backgroundColor: '#0066CC',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  itemsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemBrand: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  itemPartNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountValue: {
    color: '#4CAF50',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  addressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  paymentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  reorderButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
});