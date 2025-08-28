import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Divider,
  Surface,
  Text,
  IconButton,
  List,
  Avatar,
  Chip,
  Snackbar,
  TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  removeFromCart, 
  updateQuantity, 
  clearCart, 
  applyCoupon,
  removeCoupon 
} from '@/store/slices/cartSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CartScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { items, subtotal, shipping, tax, total, coupon } = useSelector(
    (state: RootState) => state.cart
  );
  const [couponCode, setCouponCode] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleRemoveItem = (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromCart(itemId));
            showSnackbar('Item removed from cart');
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    dispatch(updateQuantity({ itemId, quantity: newQuantity }));
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      showSnackbar('Please enter a coupon code');
      return;
    }
    
    dispatch(applyCoupon(couponCode.trim()));
    setCouponCode('');
    showSnackbar('Coupon applied successfully');
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    showSnackbar('Coupon removed');
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
          onPress: () => {
            dispatch(clearCart());
            showSnackbar('Cart cleared');
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      showSnackbar('Your cart is empty');
      return;
    }
    navigation.navigate('Checkout' as never);
  };

  const handleContinueShopping = () => {
    navigation.navigate('Parts' as never);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="cart-outline" size={120} color="#ccc" />
        <Title style={styles.emptyTitle}>Your cart is empty</Title>
        <Paragraph style={styles.emptyDescription}>
          Browse our marketplace to find the parts you need
        </Paragraph>
        <Button
          mode="contained"
          onPress={handleContinueShopping}
          style={styles.continueButton}
        >
          Continue Shopping
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Cart Items */}
        <Card style={styles.itemsCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Title>Cart Items ({items.length})</Title>
              <Button
                mode="text"
                onPress={handleClearCart}
                textColor="#e74c3c"
              >
                Clear All
              </Button>
            </View>
            <Divider style={styles.divider} />
            
            {items.map((item, index) => (
              <View key={item.id}>
                <List.Item
                  title={item.name}
                  description={
                    <View>
                      <Text>Part #: {item.partNumber}</Text>
                      <Text style={styles.brand}>by {item.brand}</Text>
                      <View style={styles.itemDetails}>
                        <Chip mode="outlined" compact>
                          {item.condition}
                        </Chip>
                        <Text style={styles.price}>
                          ${item.price.toFixed(2)} each
                        </Text>
                      </View>
                    </View>
                  }
                  left={(props) => (
                    <Avatar.Image
                      {...props}
                      source={{ uri: item.image }}
                      size={60}
                    />
                  )}
                  right={() => (
                    <View style={styles.itemActions}>
                      <View style={styles.quantityContainer}>
                        <IconButton
                          icon="minus"
                          mode="outlined"
                          size={16}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        />
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <IconButton
                          icon="plus"
                          mode="outlined"
                          size={16}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        />
                      </View>
                      <Text style={styles.itemTotal}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Text>
                      <IconButton
                        icon="delete"
                        iconColor="#e74c3c"
                        onPress={() => handleRemoveItem(item.id)}
                      />
                    </View>
                  )}
                  style={styles.cartItem}
                />
                {index < items.length - 1 && <Divider />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Coupon Section */}
        <Card style={styles.couponCard}>
          <Card.Content>
            <Title>Promo Code</Title>
            <Divider style={styles.divider} />
            
            {coupon ? (
              <View style={styles.appliedCoupon}>
                <View style={styles.couponInfo}>
                  <Text style={styles.couponCode}>{coupon.code}</Text>
                  <Text style={styles.couponDiscount}>
                    -{coupon.type === 'percentage' 
                      ? `${coupon.value}%` 
                      : `$${coupon.value.toFixed(2)}`
                    }
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  onPress={handleRemoveCoupon}
                />
              </View>
            ) : (
              <View style={styles.couponInput}>
                <TextInput
                  placeholder="Enter promo code"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  style={styles.couponTextInput}
                />
                <Button
                  mode="outlined"
                  onPress={handleApplyCoupon}
                  disabled={!couponCode.trim()}
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
            <Title>Order Summary</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text>Subtotal ({items.length} items)</Text>
              <Text>${subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text>Shipping</Text>
              <Text>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</Text>
            </View>
            
            {coupon && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountText}>
                  Discount ({coupon.code})
                </Text>
                <Text style={styles.discountText}>
                  -${coupon.discountAmount?.toFixed(2) || '0.00'}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text>Tax</Text>
              <Text>${tax.toFixed(2)}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Shipping Info */}
        <Card style={styles.shippingCard}>
          <Card.Content>
            <View style={styles.shippingInfo}>
              <Icon name="truck" size={24} color="#4CAF50" />
              <View style={styles.shippingText}>
                <Text style={styles.shippingTitle}>Free Shipping</Text>
                <Text style={styles.shippingDescription}>
                  {shipping === 0 
                    ? 'On orders over $100' 
                    : `Add $${(100 - subtotal).toFixed(2)} more for free shipping`
                  }
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <Surface style={styles.actionBar}>
        <View style={styles.actionContent}>
          <View style={styles.totalSummary}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalPrice}>${total.toFixed(2)}</Text>
          </View>
          <Button
            mode="contained"
            onPress={handleCheckout}
            style={styles.checkoutButton}
            icon="credit-card"
          >
            Proceed to Checkout
          </Button>
        </View>
      </Surface>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  continueButton: {
    minWidth: 200,
  },
  itemsCard: {
    margin: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  cartItem: {
    paddingVertical: 8,
  },
  brand: {
    color: '#2196F3',
    fontSize: 12,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    marginLeft: 8,
    fontWeight: '500',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  couponCard: {
    margin: 16,
    marginTop: 8,
  },
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponInfo: {
    flex: 1,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  couponDiscount: {
    fontSize: 14,
    color: '#4CAF50',
  },
  couponInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponTextInput: {
    flex: 1,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  discountText: {
    color: '#4CAF50',
  },
  totalRow: {
    marginTop: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  shippingCard: {
    margin: 16,
    marginTop: 8,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shippingText: {
    marginLeft: 12,
    flex: 1,
  },
  shippingTitle: {
    fontWeight: '500',
    color: '#4CAF50',
  },
  shippingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomSpacing: {
    height: 80,
  },
  actionBar: {
    elevation: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSummary: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    minWidth: 160,
  },
});

export default CartScreen;