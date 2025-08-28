import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from '../../store/hooks';

type RouteParams = {
  OrderConfirmation: {
    orderId: string;
  };
};

const OrderConfirmationScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  // This screen is mostly static, showing order confirmation

  // 2. REDUX INTEGRATION - MANDATORY
  const user = useAppSelector(state => state.user.profile);
  const { shippingAddress } = useAppSelector(state => state.cart);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'OrderConfirmation'>>();
  const { orderId } = route.params;

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    // Trigger haptic feedback for successful order
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Handlers
  const handleViewOrder = () => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const handleContinueShopping = () => {
    navigation.navigate('Main', { screen: 'Home' });
  };

  const handleTrackOrder = () => {
    navigation.navigate('OrderDetails', { orderId });
  };

  // 5. ERROR HANDLING - MANDATORY
  // No error states for this confirmation screen

  // 6. LOADING STATE - MANDATORY
  // No loading states for this static screen

  // 7. MAIN RENDER - MANDATORY
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success Animation */}
      <View style={styles.animationContainer}>
        <LottieView
          source={require('../../../assets/animations/success-animation.json')}
          autoPlay
          loop={false}
          style={styles.animation}
        />
      </View>

      {/* Success Message */}
      <View style={styles.successMessage}>
        <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
        <Text style={styles.successTitle}>Order Placed Successfully!</Text>
        <Text style={styles.successSubtitle}>
          Thank you for your order. We've sent a confirmation email to {user?.email}.
        </Text>
      </View>

      {/* Order Details Card */}
      <Card style={styles.orderCard}>
        <Card.Content>
          <View style={styles.orderHeader}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>
          
          <View style={styles.orderInfo}>
            <MaterialCommunityIcons name="calendar" size={20} color="#666" />
            <Text style={styles.orderDate}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.estimatedDelivery}>
            <MaterialCommunityIcons name="truck-delivery" size={24} color="#0066CC" />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryDate}>
                {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Shipping Address Card */}
      {shippingAddress && (
        <Card style={styles.addressCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#666" />
              <Text style={styles.cardTitle}>Shipping Address</Text>
            </View>
            <Text style={styles.addressText}>{shippingAddress.fullName}</Text>
            <Text style={styles.addressText}>{shippingAddress.addressLine1}</Text>
            {shippingAddress.addressLine2 && (
              <Text style={styles.addressText}>{shippingAddress.addressLine2}</Text>
            )}
            <Text style={styles.addressText}>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* What's Next Card */}
      <Card style={styles.nextStepsCard}>
        <Card.Content>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Processing</Text>
              <Text style={styles.stepDescription}>
                We're preparing your order for shipment
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Shipment Notification</Text>
              <Text style={styles.stepDescription}>
                You'll receive tracking info once shipped
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Delivery</Text>
              <Text style={styles.stepDescription}>
                Your parts will arrive at your doorstep
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleViewOrder}
          style={styles.primaryButton}
          buttonColor="#0066CC"
          icon="package-variant"
        >
          View Order Details
        </Button>
        
        <Button
          mode="outlined"
          onPress={handleContinueShopping}
          style={styles.secondaryButton}
          icon="cart"
        >
          Continue Shopping
        </Button>
      </View>

      {/* Help Section */}
      <Card style={styles.helpCard}>
        <Card.Content>
          <View style={styles.helpHeader}>
            <MaterialCommunityIcons name="help-circle" size={24} color="#0066CC" />
            <Text style={styles.helpTitle}>Need Help?</Text>
          </View>
          <Text style={styles.helpText}>
            If you have any questions about your order, please contact our support team.
          </Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactOption}>
              <MaterialCommunityIcons name="email" size={20} color="#0066CC" />
              <Text style={styles.contactText}>support@modmasterpro.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactOption}>
              <MaterialCommunityIcons name="phone" size={20} color="#0066CC" />
              <Text style={styles.contactText}>1-800-MOD-MASTER</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    paddingBottom: 40,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  animation: {
    width: 150,
    height: 150,
  },
  successMessage: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orderHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderId: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 4,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  estimatedDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  deliveryInfo: {
    marginLeft: 12,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#666',
  },
  deliveryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 2,
  },
  addressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
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
  nextStepsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    elevation: 2,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    marginLeft: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stepConnector: {
    width: 2,
    height: 30,
    backgroundColor: '#E0E0E0',
    marginLeft: 15,
    marginVertical: 8,
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    borderColor: '#0066CC',
  },
  helpCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#F5F9FF',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  contactOptions: {
    marginTop: 8,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 8,
  },
});