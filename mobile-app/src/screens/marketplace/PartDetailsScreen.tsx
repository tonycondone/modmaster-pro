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
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
        <Text style={styles.loadingText}>Loading part details...</Text>
      </View>
    );
  }

  if (error || !currentPart) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="car-wrench-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Part not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
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
  },
  partNumber: {
    fontSize: 14,
    color: '#666',
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
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
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
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
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