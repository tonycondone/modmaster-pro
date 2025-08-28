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
  TextInput,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, FAB, Chip, Badge, SegmentedButtons, Menu, Divider } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchParts,
  fetchFeaturedParts,
  fetchCategories,
  setFilters,
  setSortBy,
} from '../../store/slices/partsSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { Part } from '../../store/slices/partsSlice';
import { showToast } from '../../utils/toast';

const { width } = Dimensions.get('window');

const BrowsePartsScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const {
    parts,
    featuredParts,
    categories,
    isLoading,
    error: partsError,
    pagination,
    sortBy,
    filters,
  } = useAppSelector(state => state.parts);
  const cartItems = useAppSelector(state => state.cart.items);
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
      await Promise.all([
        dispatch(fetchParts({ page: 1, limit: 20 })).unwrap(),
        dispatch(fetchFeaturedParts()).unwrap(),
        dispatch(fetchCategories()).unwrap(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load parts');
      Alert.alert('Error', 'Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadMoreParts = async () => {
    if (pagination.page < pagination.pages && !isLoading) {
      await dispatch(
        fetchParts({
          page: pagination.page + 1,
          limit: 20,
          category: selectedCategory,
          filters: {
            brands: selectedBrands,
            conditions: selectedConditions,
            priceRange,
          },
          sortBy,
        })
      ).unwrap();
    }
  };

  // Handlers
  const handleSearch = () => {
    navigation.navigate('Search', { query: searchQuery });
  };

  const handlePartPress = (part: Part) => {
    navigation.navigate('PartDetails', { partId: part.id });
  };

  const handleAddToCart = async (part: Part) => {
    try {
      await dispatch(addToCart({ partId: part.id, quantity: 1 })).unwrap();
      showToast('Added to cart', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const handleCategorySelect = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setLoading(true);
    try {
      await dispatch(
        fetchParts({
          page: 1,
          limit: 20,
          category: categoryId || undefined,
          filters: {
            brands: selectedBrands,
            conditions: selectedConditions,
            priceRange,
          },
          sortBy,
        })
      ).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = async (newSortBy: any) => {
    dispatch(setSortBy(newSortBy));
    setLoading(true);
    try {
      await dispatch(
        fetchParts({
          page: 1,
          limit: 20,
          category: selectedCategory || undefined,
          filters: {
            brands: selectedBrands,
            conditions: selectedConditions,
            priceRange,
          },
          sortBy: newSortBy,
        })
      ).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setFilterMenuVisible(false);
    dispatch(
      setFilters({
        brand: selectedBrands,
        condition: selectedConditions,
        priceRange,
      })
    );
    setLoading(true);
    try {
      await dispatch(
        fetchParts({
          page: 1,
          limit: 20,
          category: selectedCategory || undefined,
          filters: {
            brands: selectedBrands,
            conditions: selectedConditions,
            priceRange,
          },
          sortBy,
        })
      ).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to load parts');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedConditions([]);
    setPriceRange({ min: 0, max: 10000 });
    dispatch(setFilters({}));
  };

  const isInCart = (partId: string) => {
    return cartItems.some(item => item.partId === partId);
  };

  // Render category item
  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === item.id && styles.categoryCardActive,
      ]}
      onPress={() => handleCategorySelect(item.id)}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={32}
        color={selectedCategory === item.id ? '#0066CC' : '#666'}
      />
      <Text
        style={[
          styles.categoryName,
          selectedCategory === item.id && styles.categoryNameActive,
        ]}
      >
        {item.name}
      </Text>
      <Text style={styles.categoryCount}>{item.count} parts</Text>
    </TouchableOpacity>
  );

  // Render featured part
  const renderFeaturedPart = ({ item }: { item: Part }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handlePartPress(item)}
    >
      <Image source={{ uri: item.images[0] }} style={styles.featuredImage} />
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>
      <View style={styles.featuredContent}>
        <Text style={styles.featuredName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.featuredPriceRow}>
          <Text style={styles.featuredPrice}>${item.price.toFixed(2)}</Text>
          {item.oldPrice && (
            <Text style={styles.featuredOldPrice}>${item.oldPrice.toFixed(2)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render part card
  const renderPartCard = ({ item }: { item: Part }) => (
    <TouchableOpacity style={styles.partCard} onPress={() => handlePartPress(item)}>
      <Card style={styles.card}>
        <View style={styles.partImageContainer}>
          <Image source={{ uri: item.images[0] }} style={styles.partImage} />
          {item.discount && item.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{item.discount}%</Text>
            </View>
          )}
          {item.availability === 'limited' && (
            <View style={styles.limitedBadge}>
              <Text style={styles.limitedText}>Limited Stock</Text>
            </View>
          )}
        </View>
        <Card.Content style={styles.partContent}>
          <Text style={styles.partBrand}>{item.brand}</Text>
          <Text style={styles.partName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={16} color="#FFB800" />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            {item.oldPrice && (
              <Text style={styles.oldPrice}>${item.oldPrice.toFixed(2)}</Text>
            )}
          </View>
          {item.shipping?.free && (
            <View style={styles.freeShipping}>
              <MaterialCommunityIcons name="truck-check" size={14} color="#4CAF50" />
              <Text style={styles.freeShippingText}>Free Shipping</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.addToCartButton, isInCart(item.id) && styles.inCartButton]}
            onPress={() => handleAddToCart(item)}
            disabled={isInCart(item.id)}
          >
            <MaterialCommunityIcons
              name={isInCart(item.id) ? 'check' : 'cart-plus'}
              size={20}
              color="#fff"
            />
            <Text style={styles.addToCartText}>
              {isInCart(item.id) ? 'In Cart' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
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
  if (loading && parts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading parts...</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={handleSearch}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666" />
        <Text style={styles.searchPlaceholder}>Search parts...</Text>
        <MaterialCommunityIcons name="barcode-scan" size={20} color="#666" />
      </TouchableOpacity>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoryCard,
              selectedCategory === null && styles.categoryCardActive,
            ]}
            onPress={() => handleCategorySelect(null)}
          >
            <MaterialCommunityIcons
              name="view-grid"
              size={32}
              color={selectedCategory === null ? '#0066CC' : '#666'}
            />
            <Text
              style={[
                styles.categoryName,
                selectedCategory === null && styles.categoryNameActive,
              ]}
            >
              All
            </Text>
            <Text style={styles.categoryCount}>{pagination.total} parts</Text>
          </TouchableOpacity>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </ScrollView>
      </View>

      {/* Featured Parts */}
      {featuredParts.length > 0 && !selectedCategory && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Parts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredParts.slice(0, 5)}
            renderItem={renderFeaturedPart}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Filter and Sort Bar */}
      <View style={styles.filterSortBar}>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterMenuVisible(true)}
            >
              <MaterialCommunityIcons name="filter-variant" size={20} color="#0066CC" />
              <Text style={styles.filterText}>Filter</Text>
              {(selectedBrands.length > 0 || selectedConditions.length > 0) && (
                <Badge style={styles.filterBadge}>
                  {selectedBrands.length + selectedConditions.length}
                </Badge>
              )}
            </TouchableOpacity>
          }
        >
          <Menu.Item title="Filter Options" disabled />
          <Divider />
          <Menu.Item onPress={clearFilters} title="Clear All Filters" />
          <Menu.Item onPress={applyFilters} title="Apply Filters" />
        </Menu>

        <SegmentedButtons
          value={sortBy}
          onValueChange={handleSortChange}
          buttons={[
            { value: 'popularity', label: 'Popular' },
            { value: 'price_low', label: 'Price ↑' },
            { value: 'price_high', label: 'Price ↓' },
            { value: 'rating', label: 'Rating' },
          ]}
          style={styles.sortButtons}
        />
      </View>

      {/* Parts List */}
      <FlatList
        data={parts}
        renderItem={renderPartCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.partsListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreParts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && parts.length > 0 ? (
            <ActivityIndicator size="small" color="#0066CC" style={styles.loadingMore} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant-closed" size={64} color="#999" />
              <Text style={styles.emptyStateTitle}>No parts found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your filters or search criteria
              </Text>
            </View>
          ) : null
        }
      />

      {/* Cart FAB */}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#999',
  },
  categoriesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: 100,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginLeft: 16,
    alignItems: 'center',
    elevation: 2,
  },
  categoryCardActive: {
    backgroundColor: '#E3F2FD',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  categoryNameActive: {
    color: '#0066CC',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  featuredSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  featuredCard: {
    width: 200,
    marginLeft: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 150,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6F00',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredContent: {
    padding: 12,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  featuredPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  featuredOldPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  filterSortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  filterText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 4,
  },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: '#FF3B30',
  },
  sortButtons: {
    flex: 1,
  },
  partsListContent: {
    padding: 8,
    paddingBottom: 100,
  },
  partCard: {
    flex: 1,
    margin: 8,
  },
  card: {
    elevation: 2,
  },
  partImageContainer: {
    position: 'relative',
  },
  partImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  limitedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FF6F00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  limitedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  partContent: {
    padding: 12,
  },
  partBrand: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  partName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
    minHeight: 36,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  oldPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  freeShipping: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  freeShippingText: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 4,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  inCartButton: {
    backgroundColor: '#4CAF50',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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