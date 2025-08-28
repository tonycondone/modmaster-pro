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
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
        <Text style={styles.loadingText}>Loading part details...</Text>
      </View>
    );
  }

  if (!part) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="package-variant-closed" size={64} color="#999" />
        <Text style={styles.errorText}>Part not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  },
  partNumber: {
    fontSize: 14,
    color: '#666',
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
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
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
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
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