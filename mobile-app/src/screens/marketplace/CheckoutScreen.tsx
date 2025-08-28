import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  Button,
  RadioButton,
  Checkbox,
  Divider,
  HelperText,
  Portal,
  Modal,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setShippingAddress,
  setPaymentMethod,
  clearCart,
} from '../../store/slices/cartSlice';
import { addAddress, updateAddress } from '../../store/slices/userSlice';
import { ShippingAddress, PaymentMethod } from '../../store/slices/cartSlice';
import { showToast } from '../../utils/toast';
import { CardField, useStripe } from '@stripe/stripe-react-native';

const CheckoutScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Address form state
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const { items, orderSummary, shippingAddress, paymentMethod } = useAppSelector(
    state => state.cart
  );
  const user = useAppSelector(state => state.user.profile);
  const userAddresses = user?.addresses || [];
  const userPaymentMethods = user?.paymentMethods || [];

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();

  // Stripe
  const { confirmPayment } = useStripe();

  const steps = ['Shipping', 'Payment', 'Review'];

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    // Set default shipping address if available
    if (userAddresses.length > 0 && !shippingAddress) {
      const defaultAddress = userAddresses.find(addr => addr.isDefault) || userAddresses[0];
      setSelectedAddressId(defaultAddress.id);
      dispatch(setShippingAddress({
        fullName: defaultAddress.fullName,
        addressLine1: defaultAddress.addressLine1,
        addressLine2: defaultAddress.addressLine2,
        city: defaultAddress.city,
        state: defaultAddress.state,
        postalCode: defaultAddress.postalCode,
        country: defaultAddress.country,
        phone: defaultAddress.phone,
      }));
    }

    // Set default payment method if available
    if (userPaymentMethods.length > 0 && !paymentMethod) {
      const defaultPayment = userPaymentMethods.find(pm => pm.isDefault) || userPaymentMethods[0];
      setSelectedPaymentId(defaultPayment.id);
      dispatch(setPaymentMethod({
        type: defaultPayment.type,
        last4: defaultPayment.last4,
        brand: defaultPayment.brand,
      }));
    }
  }, [userAddresses, userPaymentMethods]);

  // Validation
  const validateAddress = (): boolean => {
    if (!shippingAddress) {
      showToast('Please select a shipping address', 'error');
      return false;
    }
    return true;
  };

  const validatePayment = (): boolean => {
    if (!paymentMethod) {
      showToast('Please select a payment method', 'error');
      return false;
    }
    return true;
  };

  const validateOrder = (): boolean => {
    if (!termsAccepted) {
      showToast('Please accept the terms and conditions', 'error');
      return false;
    }
    return true;
  };

  // Handlers
  const handleNextStep = () => {
    if (currentStep === 0 && !validateAddress()) return;
    if (currentStep === 1 && !validatePayment()) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectAddress = (address: any) => {
    setSelectedAddressId(address.id);
    dispatch(setShippingAddress({
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    }));
  };

  const handleSaveAddress = async () => {
    try {
      // Validate address fields
      if (!addressForm.fullName || !addressForm.addressLine1 || !addressForm.city ||
          !addressForm.state || !addressForm.postalCode || !addressForm.phone) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      setLoading(true);
      await dispatch(addAddress(addressForm)).unwrap();
      dispatch(setShippingAddress(addressForm));
      setShowAddressModal(false);
      showToast('Address saved successfully', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaymentMethod = (method: any) => {
    setSelectedPaymentId(method.id);
    dispatch(setPaymentMethod({
      type: method.type,
      last4: method.last4,
      brand: method.brand,
    }));
  };

  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    try {
      setProcessing(true);

      // TODO: Create payment intent on backend
      // const { clientSecret } = await apiService.createPaymentIntent({
      //   amount: orderSummary.total,
      //   currency: orderSummary.currency,
      // });

      // TODO: Confirm payment with Stripe
      // const { error: stripeError } = await confirmPayment(clientSecret, {
      //   type: 'Card',
      //   paymentMethodId: selectedPaymentId,
      // });

      // Simulate order placement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear cart and navigate to confirmation
      await dispatch(clearCart()).unwrap();
      
      navigation.replace('OrderConfirmation', {
        orderId: 'ORD-' + Date.now(), // TODO: Get actual order ID from backend
      });

      showToast('Order placed successfully!', 'success');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              index <= currentStep && styles.stepCircleActive,
              index < currentStep && styles.stepCircleCompleted,
            ]}
          >
            {index < currentStep ? (
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentStep && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              index <= currentStep && styles.stepLabelActive,
            ]}
          >
            {step}
          </Text>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < currentStep && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Render shipping step
  const renderShippingStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Shipping Address</Text>
      
      {userAddresses.length > 0 ? (
        <>
          {userAddresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              onPress={() => handleSelectAddress(address)}
            >
              <Card
                style={[
                  styles.addressCard,
                  selectedAddressId === address.id && styles.selectedCard,
                ]}
              >
                <Card.Content>
                  <View style={styles.radioRow}>
                    <RadioButton
                      value={address.id}
                      status={selectedAddressId === address.id ? 'checked' : 'unchecked'}
                      onPress={() => handleSelectAddress(address)}
                    />
                    <View style={styles.addressInfo}>
                      <Text style={styles.addressName}>{address.fullName}</Text>
                      <Text style={styles.addressText}>{address.addressLine1}</Text>
                      {address.addressLine2 && (
                        <Text style={styles.addressText}>{address.addressLine2}</Text>
                      )}
                      <Text style={styles.addressText}>
                        {address.city}, {address.state} {address.postalCode}
                      </Text>
                      <Text style={styles.addressPhone}>{address.phone}</Text>
                      {address.isDefault && (
                        <Chip style={styles.defaultChip} textStyle={styles.defaultChipText}>
                          Default
                        </Chip>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No saved addresses</Text>
          </Card.Content>
        </Card>
      )}
      
      <Button
        mode="outlined"
        onPress={() => setShowAddressModal(true)}
        style={styles.addButton}
        icon="plus"
      >
        Add New Address
      </Button>
    </View>
  );

  // Render payment step
  const renderPaymentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Method</Text>
      
      {userPaymentMethods.length > 0 ? (
        <>
          {userPaymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => handleSelectPaymentMethod(method)}
            >
              <Card
                style={[
                  styles.paymentCard,
                  selectedPaymentId === method.id && styles.selectedCard,
                ]}
              >
                <Card.Content>
                  <View style={styles.radioRow}>
                    <RadioButton
                      value={method.id}
                      status={selectedPaymentId === method.id ? 'checked' : 'unchecked'}
                      onPress={() => handleSelectPaymentMethod(method)}
                    />
                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentHeader}>
                        <MaterialCommunityIcons
                          name={
                            method.type === 'card' ? 'credit-card' :
                            method.type === 'paypal' ? 'paypal' :
                            method.type === 'apple_pay' ? 'apple' :
                            'google'
                          }
                          size={24}
                          color="#666"
                        />
                        <Text style={styles.paymentType}>
                          {method.brand || method.type} {method.last4 && `•••• ${method.last4}`}
                        </Text>
                      </View>
                      {method.expiryMonth && (
                        <Text style={styles.paymentExpiry}>
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </Text>
                      )}
                      {method.isDefault && (
                        <Chip style={styles.defaultChip} textStyle={styles.defaultChipText}>
                          Default
                        </Chip>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No saved payment methods</Text>
          </Card.Content>
        </Card>
      )}
      
      <Button
        mode="outlined"
        onPress={() => setShowPaymentModal(true)}
        style={styles.addButton}
        icon="plus"
      >
        Add Payment Method
      </Button>
    </View>
  );

  // Render review step
  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Order</Text>
      
      {/* Order Items */}
      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewSectionTitle}>Order Items ({items.length})</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.reviewItem}>
              <Text style={styles.reviewItemName} numberOfLines={2}>
                {item.part.name}
              </Text>
              <Text style={styles.reviewItemDetails}>
                Qty: {item.quantity} × ${item.part.price.toFixed(2)} = ${(item.quantity * item.part.price).toFixed(2)}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
      
      {/* Shipping Address */}
      <Card style={styles.reviewCard}>
        <Card.Content>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewSectionTitle}>Shipping Address</Text>
            <TouchableOpacity onPress={() => setCurrentStep(0)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {shippingAddress && (
            <>
              <Text style={styles.reviewText}>{shippingAddress.fullName}</Text>
              <Text style={styles.reviewText}>{shippingAddress.addressLine1}</Text>
              {shippingAddress.addressLine2 && (
                <Text style={styles.reviewText}>{shippingAddress.addressLine2}</Text>
              )}
              <Text style={styles.reviewText}>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </Text>
              <Text style={styles.reviewText}>{shippingAddress.phone}</Text>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Payment Method */}
      <Card style={styles.reviewCard}>
        <Card.Content>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewSectionTitle}>Payment Method</Text>
            <TouchableOpacity onPress={() => setCurrentStep(1)}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {paymentMethod && (
            <View style={styles.paymentSummary}>
              <MaterialCommunityIcons
                name={paymentMethod.type === 'card' ? 'credit-card' : 'paypal'}
                size={20}
                color="#666"
              />
              <Text style={styles.reviewText}>
                {paymentMethod.brand || paymentMethod.type} {paymentMethod.last4 && `•••• ${paymentMethod.last4}`}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
      
      {/* Order Summary */}
      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewSectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
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
            <Text style={styles.summaryValue}>
              {orderSummary.shipping === 0 ? 'FREE' : `$${orderSummary.shipping.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${orderSummary.tax.toFixed(2)}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${orderSummary.total.toFixed(2)}</Text>
          </View>
        </Card.Content>
      </Card>
      
      {/* Order Notes */}
      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewSectionTitle}>Order Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special instructions..."
            value={orderNotes}
            onChangeText={setOrderNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card.Content>
      </Card>
      
      {/* Terms and Conditions */}
      <View style={styles.termsContainer}>
        <Checkbox.Item
          label="I agree to the Terms & Conditions and Privacy Policy"
          status={termsAccepted ? 'checked' : 'unchecked'}
          onPress={() => setTermsAccepted(!termsAccepted)}
          labelStyle={styles.termsLabel}
        />
      </View>
    </ScrollView>
  );

  // 5. ERROR HANDLING - MANDATORY
  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 6. LOADING STATE - MANDATORY
  if (processing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Processing your order...</Text>
        <Text style={styles.loadingSubtext}>Please don't close the app</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderStepIndicator()}
      
      <View style={styles.content}>
        {currentStep === 0 && renderShippingStep()}
        {currentStep === 1 && renderPaymentStep()}
        {currentStep === 2 && renderReviewStep()}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {currentStep > 0 && (
            <Button
              mode="outlined"
              onPress={handlePreviousStep}
              style={styles.footerButton}
            >
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              mode="contained"
              onPress={handleNextStep}
              style={styles.footerButton}
              buttonColor="#0066CC"
            >
              Continue
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handlePlaceOrder}
              loading={processing}
              disabled={!termsAccepted || processing}
              style={styles.footerButton}
              buttonColor="#0066CC"
            >
              Place Order • ${orderSummary.total.toFixed(2)}
            </Button>
          )}
        </View>
      </View>

      {/* Address Modal */}
      <Portal>
        <Modal
          visible={showAddressModal}
          onDismiss={() => setShowAddressModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <ScrollView>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={addressForm.fullName}
              onChangeText={(text) => setAddressForm({ ...addressForm, fullName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 1"
              value={addressForm.addressLine1}
              onChangeText={(text) => setAddressForm({ ...addressForm, addressLine1: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address Line 2 (Optional)"
              value={addressForm.addressLine2}
              onChangeText={(text) => setAddressForm({ ...addressForm, addressLine2: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              value={addressForm.city}
              onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="State"
                value={addressForm.state}
                onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="ZIP Code"
                value={addressForm.postalCode}
                onChangeText={(text) => setAddressForm({ ...addressForm, postalCode: text })}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={addressForm.phone}
              onChangeText={(text) => setAddressForm({ ...addressForm, phone: text })}
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowAddressModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveAddress}
                loading={loading}
                style={styles.modalButton}
                buttonColor="#0066CC"
              >
                Save Address
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
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
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#999',
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0066CC',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  stepLabelActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  addressCard: {
    marginBottom: 12,
    elevation: 1,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressInfo: {
    flex: 1,
    marginLeft: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  defaultChip: {
    backgroundColor: '#E3F2FD',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  defaultChipText: {
    fontSize: 12,
    color: '#0066CC',
  },
  emptyCard: {
    marginBottom: 12,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  addButton: {
    marginTop: 12,
  },
  paymentCard: {
    marginBottom: 12,
    elevation: 1,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  paymentExpiry: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reviewCard: {
    marginBottom: 16,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editText: {
    fontSize: 14,
    color: '#0066CC',
  },
  reviewItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  reviewItemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  paymentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
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
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginTop: 8,
  },
  termsContainer: {
    marginBottom: 20,
  },
  termsLabel: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});