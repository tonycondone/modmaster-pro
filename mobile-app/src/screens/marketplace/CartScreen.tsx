import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, Divider, Snackbar, IconButton } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCart,
  removeFromCart,
  updateCartItem,
  moveToSavedForLater,
  moveToCart,
  applyPromoCode,
  clearCart,
  updateQuantityLocally,
  setShippingCost,
} from '../../store/slices/cartSlice';
import { CartItem } from '../../store/slices/cartSlice';
import { showToast } from '../../utils/toast';

const CartScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<{ [key: string]: boolean }>({});

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const {
    items,
    savedForLater,
    orderSummary,
    promoCode,
    isLoading,
    error: cartError,
  } = useAppSelector(state => state.cart);
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
      await dispatch(fetchCart()).unwrap();
      
      // Calculate shipping based on total
      const shippingCost = orderSummary.subtotal >= 50 ? 0 : 9.99;
      dispatch(setShippingCost(shippingCost));
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
      Alert.alert('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Handlers
  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(item);
      return;
    }

    // Update locally first for instant feedback
    dispatch(updateQuantityLocally({ itemId: item.id, quantity: newQuantity }));
    
    try {
      setUpdatingItems({ ...updatingItems, [item.id]: true });
      await dispatch(
        updateCartItem({
          itemId: item.id,
          quantity: newQuantity,
        })
      ).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity');
      // Revert local change on error
      dispatch(updateQuantityLocally({ itemId: item.id, quantity: item.quantity }));
    } finally {
      setUpdatingItems({ ...updatingItems, [item.id]: false });
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      `Remove ${item.part.name} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeFromCart(item.id)).unwrap();
              showToast('Item removed from cart', 'success');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const handleMoveToSavedForLater = async (item: CartItem) => {
    try {
      await dispatch(moveToSavedForLater(item.id)).unwrap();
      showToast('Moved to saved for later', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to move item');
    }
  };

  const handleMoveToCart = async (item: CartItem) => {
    try {
      await dispatch(moveToCart(item.id)).unwrap();
      showToast('Moved to cart', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to move item');
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      showToast('Please enter a promo code', 'error');
      return;
    }

    try {
      setApplyingPromo(true);
      await dispatch(applyPromoCode(promoCodeInput)).unwrap();
      showToast('Promo code applied successfully', 'success');
      setPromoCodeInput('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(clearCart()).unwrap();
              showToast('Cart cleared', 'success');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cart');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to proceed with checkout',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    navigation.navigate('Checkout');
  };

  const handleContinueShopping = () => {
    navigation.navigate('BrowseParts');
  };

  const renderCartItem = (item: CartItem) => (
    <Card key={item.id} style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemRow}>
          <Image source={{ uri: item.part.images[0] }} style={styles.itemImage} />
          <View style={styles.itemInfo}>
            <Text style={styles.itemBrand}>{item.part.brand}</Text>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.part.name}
            </Text>
            <Text style={styles.itemPartNumber}>Part # {item.part.partNumber}</Text>
            
            {/* Availability */}
            {item.part.availability === 'in_stock' ? (
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#4CAF50" />
                <Text style={styles.inStock}>In Stock</Text>
              </View>
            ) : (
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="alert-circle" size={14} color="#FF6F00" />
                <Text style={styles.limitedStock}>Limited Stock</Text>
              </View>
            )}

            {/* Price */}
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>${item.part.price.toFixed(2)}</Text>
              {item.part.oldPrice && (
                <Text style={styles.itemOldPrice}>${item.part.oldPrice.toFixed(2)}</Text>
              )}
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Qty:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
                  disabled={updatingItems[item.id]}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#666" />
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
                  disabled={updatingItems[item.id]}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              {updatingItems[item.id] && (
                <ActivityIndicator size="small" color="#0066CC" style={styles.updatingSpinner} />
              )}
            </View>
          </View>
          
          {/* Subtotal */}
          <View style={styles.itemSubtotal}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>
              ${(item.part.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Item Actions */}
        <Divider style={styles.divider} />
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.itemAction}
            onPress={() => handleMoveToSavedForLater(item)}
          >
            <MaterialCommunityIcons name="bookmark-outline" size={16} color="#0066CC" />
            <Text style={styles.itemActionText}>Save for Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.itemAction}
            onPress={() => handleRemoveItem(item)}
          >
            <MaterialCommunityIcons name="delete-outline" size={16} color="#FF3B30" />
            <Text style={[styles.itemActionText, { color: '#FF3B30' }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSavedItem = (item: CartItem) => (
    <Card key={item.id} style={styles.savedItemCard}>
      <Card.Content style={styles.savedItemContent}>
        <Image source={{ uri: item.part.images[0] }} style={styles.savedItemImage} />
        <View style={styles.savedItemInfo}>
          <Text style={styles.savedItemName} numberOfLines={2}>
            {item.part.name}
          </Text>
          <Text style={styles.savedItemPrice}>${item.part.price.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.moveToCartButton}
            onPress={() => handleMoveToCart(item)}
          >
            <Text style={styles.moveToCartText}>Move to Cart</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
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
  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  // Empty Cart
  if (items.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="cart-off" size={80} color="#999" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>
          Add some parts to get started with your vehicle maintenance
        </Text>
        <Button
          mode="contained"
          onPress={handleContinueShopping}
          style={styles.continueButton}
          buttonColor="#0066CC"
        >
          Continue Shopping
        </Button>
        
        {savedForLater.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved for Later ({savedForLater.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savedForLater.map(renderSavedItem)}
            </ScrollView>
          </View>
        )}
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
        {/* Cart Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart ({items.length})</Text>
          <TouchableOpacity onPress={handleClearCart}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Free Shipping Banner */}
        {orderSummary.shipping > 0 && orderSummary.subtotal < 50 && (
          <Card style={styles.shippingBanner}>
            <Card.Content style={styles.shippingBannerContent}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="#FF6F00" />
              <View style={styles.shippingBannerText}>
                <Text style={styles.shippingBannerTitle}>
                  Add ${(50 - orderSummary.subtotal).toFixed(2)} more for FREE shipping!
                </Text>
                <View style={styles.shippingProgress}>
                  <View
                    style={[
                      styles.shippingProgressBar,
                      { width: `${(orderSummary.subtotal / 50) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Cart Items */}
        <View style={styles.itemsContainer}>
          {items.map(renderCartItem)}
        </View>

        {/* Promo Code */}
        <Card style={styles.promoCard}>
          <Card.Content>
            <Text style={styles.promoTitle}>Have a promo code?</Text>
            {promoCode ? (
              <View style={styles.appliedPromo}>
                <View style={styles.appliedPromoInfo}>
                  <MaterialCommunityIcons name="tag" size={20} color="#4CAF50" />
                  <Text style={styles.appliedPromoCode}>{promoCode.code}</Text>
                  <Text style={styles.appliedPromoDiscount}>
                    -{promoCode.type === 'percentage' ? `${promoCode.discount}%` : `$${promoCode.discount}`}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => dispatch(removePromoCode())}
                />
              </View>
            ) : (
              <View style={styles.promoInput}>
                <TextInput
                  style={styles.promoTextInput}
                  placeholder="Enter promo code"
                  value={promoCodeInput}
                  onChangeText={setPromoCodeInput}
                  autoCapitalize="characters"
                />
                <Button
                  mode="outlined"
                  onPress={handleApplyPromoCode}
                  loading={applyingPromo}
                  disabled={!promoCodeInput.trim() || applyingPromo}
                  style={styles.promoButton}
                >
                  Apply
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
              <Text style={styles.summaryValue}>${orderSummary.subtotal.toFixed(2)}</Text>
            </View>
            
            {orderSummary.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -${orderSummary.discount.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={[styles.summaryValue, orderSummary.shipping === 0 && styles.freeShippingValue]}>
                {orderSummary.shipping === 0 ? 'FREE' : `$${orderSummary.shipping.toFixed(2)}`}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Tax</Text>
              <Text style={styles.summaryValue}>${orderSummary.tax.toFixed(2)}</Text>
            </View>
            
            <Divider style={styles.summaryDivider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${orderSummary.total.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Saved for Later */}
        {savedForLater.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved for Later ({savedForLater.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savedForLater.map(renderSavedItem)}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutTotal}>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <Text style={styles.checkoutTotalValue}>${orderSummary.total.toFixed(2)}</Text>
        </View>
        <Button
          mode="contained"
          onPress={handleCheckout}
          style={styles.checkoutButton}
          buttonColor="#0066CC"
          disabled={items.length === 0}
        >
          Proceed to Checkout
        </Button>
      </View>
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
  emptyContainer: {
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
  continueButton: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  shippingBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF3E0',
    elevation: 1,
  },
  shippingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shippingBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  shippingBannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6F00',
  },
  shippingProgress: {
    height: 4,
    backgroundColor: '#FFE0B2',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  shippingProgressBar: {
    height: '100%',
    backgroundColor: '#FF6F00',
  },
  itemsContainer: {
    paddingHorizontal: 16,
  },
  itemCard: {
    marginBottom: 12,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
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
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inStock: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  limitedStock: {
    fontSize: 12,
    color: '#FF6F00',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  itemOldPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  quantityButton: {
    padding: 4,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 12,
  },
  updatingSpinner: {
    marginLeft: 8,
  },
  itemSubtotal: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  subtotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  itemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  itemActionText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 4,
  },
  promoCard: {
    margin: 16,
    elevation: 2,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  promoInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 12,
  },
  promoButton: {
    borderColor: '#0066CC',
  },
  appliedPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  appliedPromoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedPromoCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  appliedPromoDiscount: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  summaryCard: {
    margin: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
  freeShippingValue: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  summaryDivider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  savedSection: {
    marginTop: 24,
    paddingBottom: 16,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  savedItemCard: {
    width: 180,
    marginLeft: 16,
    elevation: 1,
  },
  savedItemContent: {
    alignItems: 'center',
  },
  savedItemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  savedItemInfo: {
    alignItems: 'center',
  },
  savedItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  savedItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
  },
  moveToCartButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 4,
  },
  moveToCartText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
  },
  checkoutTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutTotalLabel: {
    fontSize: 16,
    color: '#666',
  },
  checkoutTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  checkoutButton: {
    paddingVertical: 4,
  },
});