<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Share,
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
  IconButton,
  Avatar,
  List,
  Rating,
  Snackbar,
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchPartById, addToFavorites, removeFromFavorites, addToCart } from '@/store/slices/partSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Carousel from 'react-native-snap-carousel';

const { width: screenWidth } = Dimensions.get('window');

type PartDetailsRouteProp = RouteProp<
  { PartDetails: { partId: string } },
  'PartDetails'
>;

const PartDetailsScreen: React.FC = () => {
  const route = useRoute<PartDetailsRouteProp>();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { partId } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { currentPart, loading, error, favorites } = useSelector((state: RootState) => state.parts);
  const { items: cartItems } = useSelector((state: RootState) => state.cart);

  const isInFavorites = favorites.some(fav => fav.id === partId);
  const isInCart = cartItems.some(item => item.partId === partId);

  useEffect(() => {
    dispatch(fetchPartById(partId) as any);
  }, [partId]);

  const handleAddToFavorites = async () => {
    try {
      if (isInFavorites) {
        await dispatch(removeFromFavorites(partId) as any);
        showSnackbar('Removed from favorites');
      } else {
        await dispatch(addToFavorites(partId) as any);
        showSnackbar('Added to favorites');
      }
    } catch (error) {
      showSnackbar('Failed to update favorites');
    }
  };

  const handleAddToCart = async () => {
    try {
      await dispatch(addToCart({ partId, quantity }) as any);
      showSnackbar('Added to cart');
    } catch (error) {
      showSnackbar('Failed to add to cart');
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigation.navigate('Cart' as never);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${currentPart?.name} on ModMaster Pro!`,
        url: `https://modmaster.pro/parts/${partId}`,
=======
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
  Dimensions,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  Button,
  Chip,
  Divider,
  FAB,
  ProgressBar,
  RadioButton,
  Snackbar,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchPartById,
  fetchPartReviews,
  addPartReview,
  checkPartCompatibility,
} from '../../store/slices/partsSlice';
import { addToCart, updateCartItem } from '../../store/slices/cartSlice';
import { Part, PartReview } from '../../store/slices/partsSlice';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

type RouteParams = {
  PartDetails: {
    partId: string;
  };
};

const PartDetailsScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isCompatible, setIsCompatible] = useState<boolean | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [wishlistAdded, setWishlistAdded] = useState(false);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const part = useAppSelector(state => state.parts.currentPart);
  const reviews = useAppSelector(state => state.parts.reviews[part?.id || ''] || []);
  const cartItems = useAppSelector(state => state.cart.items);
  const userVehicles = useAppSelector(state => state.vehicles.vehicles);
  const user = useAppSelector(state => state.auth.user);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'PartDetails'>>();
  const { partId } = route.params;

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadData();
  }, [partId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        dispatch(fetchPartById(partId)).unwrap(),
        dispatch(fetchPartReviews({ partId })).unwrap(),
      ]);
      
      // Check compatibility with user's vehicles
      if (userVehicles.length > 0) {
        const compatibilityResult = await dispatch(
          checkPartCompatibility({ partId, vehicleId: userVehicles[0].id })
        ).unwrap();
        setIsCompatible(compatibilityResult.compatible);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load part details');
      Alert.alert('Error', 'Failed to load part details');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = useCallback(() => {
    if (!reviews.length) return { average: 0, distribution: [0, 0, 0, 0, 0] };
    
    const distribution = [0, 0, 0, 0, 0];
    let total = 0;
    
    reviews.forEach(review => {
      distribution[5 - review.rating]++;
      total += review.rating;
    });
    
    return {
      average: total / reviews.length,
      distribution,
    };
  }, [reviews]);

  const stats = calculateStats();

  // Handlers
  const handleAddToCart = async () => {
    if (!part) return;
    
    try {
      setAddingToCart(true);
      
      const existingItem = cartItems.find(item => item.partId === part.id);
      
      if (existingItem) {
        await dispatch(
          updateCartItem({
            itemId: existingItem.id,
            quantity: existingItem.quantity + quantity,
          })
        ).unwrap();
      } else {
        await dispatch(
          addToCart({
            partId: part.id,
            quantity,
          })
        ).unwrap();
      }
      
      showToast(`Added ${quantity} item(s) to cart`, 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigation.navigate('Cart');
  };

  const handleAddToWishlist = () => {
    // TODO: Implement wishlist functionality
    setWishlistAdded(true);
    showToast('Added to wishlist', 'success');
  };

  const handleShare = async () => {
    if (!part) return;
    
    try {
      await Share.share({
        message: `Check out this part: ${part.name} - $${part.price.toFixed(2)}`,
        title: part.name,
>>>>>>> v.3.0
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

<<<<<<< HEAD
  const handleContactSeller = () => {
    // Navigate to chat or contact screen
    navigation.navigate('Chat' as never, { sellerId: currentPart?.sellerId } as never);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const renderImageCarousel = () => {
    const images = currentPart?.images || [{ url: 'https://via.placeholder.com/400x300?text=No+Image' }];
    
    return (
      <View style={styles.imageContainer}>
        <Carousel
          data={images}
          renderItem={({ item }) => (
            <Surface style={styles.imageCard}>
              <Avatar.Image
                source={{ uri: item.url }}
                size={screenWidth - 32}
                style={styles.partImage}
              />
            </Surface>
          )}
          sliderWidth={screenWidth}
          itemWidth={screenWidth - 32}
          onSnapToItem={setActiveImageIndex}
          layout="default"
        />
        <View style={styles.imageIndicators}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === activeImageIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  if (loading && !currentPart) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
=======
  const handleAskQuestion = () => {
    // TODO: Implement Q&A functionality
    showToast('Q&A feature coming soon', 'info');
  };

  const handleReportIssue = () => {
    // TODO: Implement report functionality
    showToast('Report feature coming soon', 'info');
  };

  const handleSellerInfo = () => {
    // TODO: Navigate to seller profile
    showToast('Seller profiles coming soon', 'info');
  };

  const renderRatingBar = (rating: number, count: number, total: number) => (
    <View style={styles.ratingBar}>
      <Text style={styles.ratingBarLabel}>{rating}</Text>
      <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
      <View style={styles.ratingBarProgress}>
        <ProgressBar
          progress={total > 0 ? count / total : 0}
          color="#FFB800"
          style={styles.progressBar}
        />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </View>
  );

  const renderReview = (review: PartReview) => (
    <Card key={review.id} style={styles.reviewCard}>
      <Card.Content>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            <View style={styles.reviewerAvatar}>
              <Text style={styles.reviewerInitial}>
                {review.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.reviewerName}>{review.userName}</Text>
              <View style={styles.reviewRating}>
                {[...Array(5)].map((_, i) => (
                  <MaterialCommunityIcons
                    key={i}
                    name="star"
                    size={14}
                    color={i < review.rating ? '#FFB800' : '#E0E0E0'}
                  />
                ))}
                <Text style={styles.reviewDate}>
                  {format(new Date(review.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
          </View>
          {review.verified && (
            <Chip
              icon="check-decagram"
              style={styles.verifiedChip}
              textStyle={styles.verifiedChipText}
            >
              Verified Purchase
            </Chip>
          )}
        </View>
        
        {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
        <Text style={styles.reviewComment}>{review.comment}</Text>
        
        {review.photos && review.photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reviewPhotos}
          >
            {review.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.reviewPhoto}
              />
            ))}
          </ScrollView>
        )}
        
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.reviewAction}>
            <MaterialCommunityIcons name="thumb-up-outline" size={16} color="#666" />
            <Text style={styles.reviewActionText}>
              Helpful ({review.helpful})
            </Text>
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
  if (loading && !part) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
>>>>>>> v.3.0
        <Text style={styles.loadingText}>Loading part details...</Text>
      </View>
    );
  }

<<<<<<< HEAD
  if (error || !currentPart) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="car-wrench-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Part not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
=======
  if (!part) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="package-variant-closed" size={64} color="#999" />
        <Text style={styles.errorText}>Part not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
>>>>>>> v.3.0
      </View>
    );
  }

<<<<<<< HEAD
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Image Carousel */}
        {renderImageCarousel()}

        {/* Part Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.partInfo}>
                <Title style={styles.partName}>{currentPart.name}</Title>
                <Text style={styles.partNumber}>Part #: {currentPart.partNumber}</Text>
                <Text style={styles.brand}>by {currentPart.brand}</Text>
              </View>
              <IconButton
                icon={isInFavorites ? 'heart' : 'heart-outline'}
                iconColor={isInFavorites ? '#e74c3c' : '#666'}
                onPress={handleAddToFavorites}
              />
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>${currentPart.price.toFixed(2)}</Text>
              <View style={styles.ratingContainer}>
                <Rating value={currentPart.averageRating || 0} readonly size={16} />
                <Text style={styles.reviewCount}>
                  ({currentPart.reviewCount || 0} reviews)
                </Text>
              </View>
            </View>

            <View style={styles.chipsContainer}>
              <Chip
                icon="tag"
                mode="outlined"
                style={styles.chip}
              >
                {currentPart.category}
              </Chip>
              <Chip
                icon="check-circle"
                mode="outlined"
                style={[
                  styles.chip,
                  { backgroundColor: currentPart.condition === 'new' ? '#e8f5e8' : '#fff3cd' }
                ]}
              >
                {currentPart.condition}
              </Chip>
              {currentPart.inStock && (
                <Chip
                  icon="package-variant"
                  mode="outlined"
                  style={[styles.chip, { backgroundColor: '#e8f5e8' }]}
                >
                  In Stock ({currentPart.stockQuantity})
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Description */}
        <Card style={styles.descriptionCard}>
          <Card.Content>
            <Title>Description</Title>
            <Divider style={styles.divider} />
            <Paragraph>{currentPart.description}</Paragraph>
          </Card.Content>
        </Card>

        {/* Specifications */}
        {currentPart.specifications && (
          <Card style={styles.specsCard}>
            <Card.Content>
              <Title>Specifications</Title>
              <Divider style={styles.divider} />
              {Object.entries(currentPart.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specLabel}>{key}:</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Compatibility */}
        {currentPart.compatibility && currentPart.compatibility.length > 0 && (
          <Card style={styles.compatibilityCard}>
            <Card.Content>
              <Title>Compatibility</Title>
              <Divider style={styles.divider} />
              {currentPart.compatibility.map((vehicle, index) => (
                <List.Item
                  key={index}
                  title={vehicle.make + ' ' + vehicle.model}
                  description={`${vehicle.yearStart} - ${vehicle.yearEnd}`}
                  left={(props) => <List.Icon {...props} icon="car" />}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Seller Info */}
        <Card style={styles.sellerCard}>
          <Card.Content>
            <Title>Seller Information</Title>
            <Divider style={styles.divider} />
            <List.Item
              title={currentPart.seller?.name || 'Unknown Seller'}
              description={`${currentPart.seller?.rating || 0}/5 • ${currentPart.seller?.reviewCount || 0} reviews`}
              left={(props) => (
                <Avatar.Image
                  {...props}
                  source={{ uri: currentPart.seller?.avatar || 'https://via.placeholder.com/40' }}
                  size={40}
                />
              )}
              right={(props) => (
                <Button
                  {...props}
                  mode="outlined"
                  compact
                  onPress={handleContactSeller}
                >
                  Contact
                </Button>
              )}
            />
          </Card.Content>
        </Card>

        {/* Quantity Selector */}
        <Card style={styles.quantityCard}>
          <Card.Content>
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <IconButton
                  icon="minus"
                  mode="outlined"
                  size={20}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                />
                <Text style={styles.quantityText}>{quantity}</Text>
                <IconButton
                  icon="plus"
                  mode="outlined"
                  size={20}
                  onPress={() => setQuantity(quantity + 1)}
                  disabled={quantity >= (currentPart.stockQuantity || 1)}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <Surface style={styles.actionBar}>
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleShare}
            style={styles.shareButton}
            icon="share"
          >
            Share
          </Button>
          <Button
            mode="outlined"
            onPress={handleAddToCart}
            style={styles.cartButton}
            disabled={!currentPart.inStock || isInCart}
          >
            {isInCart ? 'In Cart' : 'Add to Cart'}
          </Button>
          <Button
            mode="contained"
            onPress={handleBuyNow}
            style={styles.buyButton}
            disabled={!currentPart.inStock}
          >
            Buy Now
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
=======
  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
          >
            {part.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.productImage} />
            ))}
          </ScrollView>
          {part.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {part.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicator,
                    index === selectedImageIndex && styles.imageIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={handleAddToWishlist}
          >
            <MaterialCommunityIcons
              name={wishlistAdded ? 'heart' : 'heart-outline'}
              size={24}
              color={wishlistAdded ? '#FF3B30' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.brand}>{part.brand}</Text>
          <Text style={styles.name}>{part.name}</Text>
          <Text style={styles.partNumber}>Part # {part.partNumber}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <MaterialCommunityIcons
                  key={i}
                  name="star"
                  size={20}
                  color={i < Math.floor(part.rating) ? '#FFB800' : '#E0E0E0'}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{part.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({part.reviewCount} reviews)</Text>
          </View>

          {/* Compatibility Check */}
          {isCompatible !== null && (
            <View style={[styles.compatibilityBadge, isCompatible ? styles.compatible : styles.incompatible]}>
              <MaterialCommunityIcons
                name={isCompatible ? 'check-circle' : 'alert-circle'}
                size={20}
                color={isCompatible ? '#4CAF50' : '#FF6F00'}
              />
              <Text style={[styles.compatibilityText, isCompatible ? styles.compatibleText : styles.incompatibleText]}>
                {isCompatible ? 'Compatible with your vehicle' : 'May not fit your vehicle'}
              </Text>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${part.price.toFixed(2)}</Text>
              {part.oldPrice && (
                <>
                  <Text style={styles.oldPrice}>${part.oldPrice.toFixed(2)}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      -{Math.round(((part.oldPrice - part.price) / part.oldPrice) * 100)}%
                    </Text>
                  </View>
                </>
              )}
            </View>
            
            {part.availability === 'in_stock' ? (
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.inStock}>In Stock</Text>
                {part.stockCount && part.stockCount < 10 && (
                  <Text style={styles.lowStock}>Only {part.stockCount} left</Text>
                )}
              </View>
            ) : part.availability === 'limited' ? (
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#FF6F00" />
                <Text style={styles.limitedStock}>Limited Stock</Text>
              </View>
            ) : (
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#FF3B30" />
                <Text style={styles.outOfStock}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* Shipping Info */}
          <Card style={styles.shippingCard}>
            <Card.Content>
              <View style={styles.shippingRow}>
                <MaterialCommunityIcons
                  name="truck-delivery"
                  size={20}
                  color={part.shipping?.free ? '#4CAF50' : '#666'}
                />
                <View style={styles.shippingInfo}>
                  {part.shipping?.free ? (
                    <Text style={styles.freeShipping}>FREE Shipping</Text>
                  ) : (
                    <Text style={styles.shippingCost}>
                      Shipping: ${part.shipping?.cost?.toFixed(2) || '0.00'}
                    </Text>
                  )}
                  <Text style={styles.shippingTime}>
                    Estimated delivery: {part.shipping?.estimatedDays || 3-5} business days
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <MaterialCommunityIcons
                  name="minus"
                  size={20}
                  color={quantity <= 1 ? '#999' : '#333'}
                />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
                disabled={part.stockCount ? quantity >= part.stockCount : false}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={part.stockCount && quantity >= part.stockCount ? '#999' : '#333'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={handleAddToCart}
              loading={addingToCart}
              disabled={part.availability === 'out_of_stock'}
              style={styles.addToCartButton}
              buttonColor="#FF6F00"
            >
              Add to Cart
            </Button>
            <Button
              mode="contained"
              onPress={handleBuyNow}
              disabled={part.availability === 'out_of_stock'}
              style={styles.buyNowButton}
              buttonColor="#0066CC"
            >
              Buy Now
            </Button>
          </View>

          {/* Seller Info */}
          <TouchableOpacity onPress={handleSellerInfo}>
            <Card style={styles.sellerCard}>
              <Card.Content style={styles.sellerContent}>
                <View style={styles.sellerInfo}>
                  <MaterialCommunityIcons name="store" size={24} color="#0066CC" />
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{part.seller.name}</Text>
                    <View style={styles.sellerRating}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                      <Text style={styles.sellerRatingText}>
                        {part.seller.rating.toFixed(1)} ({part.seller.reviewCount} reviews)
                      </Text>
                    </View>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </Card.Content>
            </Card>
          </TouchableOpacity>

          {/* Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {part.specifications && Object.entries(part.specifications).length > 0 ? (
              <>
                {Object.entries(part.specifications)
                  .slice(0, showAllSpecs ? undefined : 5)
                  .map(([key, value]) => (
                    <View key={key} style={styles.specRow}>
                      <Text style={styles.specKey}>{key}</Text>
                      <Text style={styles.specValue}>{value}</Text>
                    </View>
                  ))}
                {Object.entries(part.specifications).length > 5 && (
                  <TouchableOpacity
                    onPress={() => setShowAllSpecs(!showAllSpecs)}
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllSpecs ? 'Show Less' : 'Show All Specifications'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.noSpecs}>No specifications available</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{part.description}</Text>
          </View>

          {/* Warranty */}
          {part.warranty && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Warranty</Text>
              <View style={styles.warrantyInfo}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#4CAF50" />
                <Text style={styles.warrantyText}>
                  {part.warranty.duration} {part.warranty.type} warranty included
                </Text>
              </View>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <TouchableOpacity>
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            </View>

            {/* Rating Summary */}
            <View style={styles.ratingSummary}>
              <View style={styles.ratingOverview}>
                <Text style={styles.bigRating}>{stats.average.toFixed(1)}</Text>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <MaterialCommunityIcons
                      key={i}
                      name="star"
                      size={16}
                      color={i < Math.floor(stats.average) ? '#FFB800' : '#E0E0E0'}
                    />
                  ))}
                </View>
                <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
              </View>
              <View style={styles.ratingDistribution}>
                {[5, 4, 3, 2, 1].map((rating, index) => 
                  renderRatingBar(rating, stats.distribution[index], reviews.length)
                )}
              </View>
            </View>

            {/* Reviews List */}
            {reviews.length > 0 ? (
              <>
                {reviews
                  .slice(0, showAllReviews ? undefined : 3)
                  .map(renderReview)}
                {reviews.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowAllReviews(!showAllReviews)}
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllReviews ? 'Show Less Reviews' : `Show All ${reviews.length} Reviews`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Card style={styles.noReviewsCard}>
                <Card.Content>
                  <Text style={styles.noReviewsText}>No reviews yet</Text>
                  <Text style={styles.beFirstText}>Be the first to review this product!</Text>
                </Card.Content>
              </Card>
            )}
          </View>

          {/* Q&A Section */}
          <View style={styles.section}>
            <View style={styles.qaHeader}>
              <Text style={styles.sectionTitle}>Questions & Answers</Text>
              <TouchableOpacity onPress={handleAskQuestion}>
                <Text style={styles.askQuestionText}>Ask a Question</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.qaCard}>
              <Card.Content>
                <Text style={styles.noQaText}>No questions yet</Text>
              </Card.Content>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <FAB
          style={styles.fab}
          icon="cart"
          onPress={() => navigation.navigate('Cart')}
          label={`Cart (${cartItems.length})`}
        />
      )}
>>>>>>> v.3.0
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
=======
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 100,
>>>>>>> v.3.0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
<<<<<<< HEAD
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
=======
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
>>>>>>> v.3.0
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
<<<<<<< HEAD
    fontSize: 18,
    marginVertical: 16,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    elevation: 4,
  },
  partImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#2196F3',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
=======
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
  imageSection: {
    height: 300,
    backgroundColor: '#fff',
    position: 'relative',
  },
  productImage: {
    width,
    height: 300,
    resizeMode: 'contain',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 4,
  },
  imageIndicatorActive: {
    backgroundColor: '#0066CC',
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
  },
  wishlistButton: {
    position: 'absolute',
    top: 16,
    right: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
  },
  infoSection: {
    padding: 16,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
>>>>>>> v.3.0
  },
  partNumber: {
    fontSize: 14,
    color: '#666',
<<<<<<< HEAD
    marginBottom: 2,
  },
  brand: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
=======
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  compatible: {
    backgroundColor: '#E8F5E9',
  },
  incompatible: {
    backgroundColor: '#FFF3E0',
  },
  compatibilityText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  compatibleText: {
    color: '#4CAF50',
  },
  incompatibleText: {
    color: '#FF6F00',
  },
  priceSection: {
    marginTop: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
>>>>>>> v.3.0
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
<<<<<<< HEAD
    color: '#4CAF50',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  descriptionCard: {
    margin: 16,
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  specsCard: {
    margin: 16,
    marginTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  specLabel: {
    fontWeight: '500',
    flex: 1,
  },
  specValue: {
    flex: 1,
    textAlign: 'right',
  },
  compatibilityCard: {
    margin: 16,
    marginTop: 8,
  },
  sellerCard: {
    margin: 16,
    marginTop: 8,
  },
  quantityCard: {
    margin: 16,
    marginTop: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
=======
    color: '#0066CC',
  },
  oldPrice: {
    fontSize: 20,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 12,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  inStock: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 4,
  },
  lowStock: {
    fontSize: 14,
    color: '#FF6F00',
    marginLeft: 8,
  },
  limitedStock: {
    fontSize: 14,
    color: '#FF6F00',
    fontWeight: '500',
    marginLeft: 4,
  },
  outOfStock: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 4,
  },
  shippingCard: {
    marginTop: 16,
    elevation: 1,
  },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shippingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  freeShipping: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  shippingCost: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  shippingTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
>>>>>>> v.3.0
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
<<<<<<< HEAD
=======
    color: '#333',
>>>>>>> v.3.0
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
<<<<<<< HEAD
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 80,
  },
  actionBar: {
    elevation: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flex: 0.2,
  },
  cartButton: {
    flex: 0.35,
    marginHorizontal: 8,
  },
  buyButton: {
    flex: 0.35,
  },
});

export default PartDetailsScreen;
=======
    marginLeft: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  quantityButton: {
    padding: 12,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  addToCartButton: {
    flex: 1,
  },
  buyNowButton: {
    flex: 1,
  },
  sellerCard: {
    marginTop: 20,
    elevation: 1,
  },
  sellerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerDetails: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerRatingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  specKey: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  noSpecs: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  showMoreButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  warrantyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warrantyText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  ratingSummary: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  ratingOverview: {
    alignItems: 'center',
    flex: 1,
  },
  bigRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingDistribution: {
    flex: 2,
    marginLeft: 24,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: '#666',
    width: 12,
  },
  ratingBarProgress: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  reviewCard: {
    marginBottom: 12,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  verifiedChip: {
    backgroundColor: '#E8F5E9',
    height: 24,
  },
  verifiedChipText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  reviewPhotos: {
    marginTop: 12,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  reviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewActionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  noReviewsCard: {
    elevation: 1,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  beFirstText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  qaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  askQuestionText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  qaCard: {
    elevation: 1,
  },
  noQaText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
});
>>>>>>> v.3.0
