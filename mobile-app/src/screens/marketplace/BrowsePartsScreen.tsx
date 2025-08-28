import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Searchbar,
  Chip,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchParts, searchParts, setFilters } from '@/store/slices/partSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const BrowsePartsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { parts, isLoading, pagination } = useSelector((state: RootState) => state.parts);

  const categories = [
    'Engine',
    'Transmission',
    'Brakes',
    'Suspension',
    'Electrical',
    'Body',
    'Interior',
    'Exhaust',
  ];

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      await dispatch(fetchParts({ page: 1 }));
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParts();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await dispatch(searchParts(searchQuery.trim()));
    } else {
      await loadParts();
    }
  };

  const handleCategoryFilter = async (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      dispatch(setFilters({ category: undefined }));
    } else {
      setSelectedCategory(category);
      dispatch(setFilters({ category }));
    }
    await dispatch(fetchParts({ page: 1 }));
  };

  const renderPartItem = ({ item }: { item: any }) => (
    <Card style={styles.partCard} onPress={() => navigation.navigate('PartDetails' as never, { partId: item.id } as never)}>
      <Card.Cover source={{ uri: item.images[0] || 'https://via.placeholder.com/300x200' }} />
      <Card.Content style={styles.partContent}>
        <Title style={styles.partTitle} numberOfLines={2}>{item.name}</Title>
        <Paragraph style={styles.partBrand}>{item.brand}</Paragraph>
        <View style={styles.partMeta}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color={theme.colors.primary} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount})</Text>
          </View>
          <Chip
            mode="outlined"
            textStyle={{ fontSize: 12 }}
            style={styles.conditionChip}
          >
            {item.condition}
          </Chip>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.price.toLocaleString()}</Text>
          <Text style={styles.shipping}>+${item.shippingCost} shipping</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="car-wrench" size={64} color={theme.colors.outline} />
      <Text style={styles.emptyTitle}>No parts found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search or filters
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search parts..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
        />
      </View>

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Chip
              mode={selectedCategory === item ? 'flat' : 'outlined'}
              selected={selectedCategory === item}
              onPress={() => handleCategoryFilter(item)}
              style={styles.categoryChip}
              textStyle={styles.categoryChipText}
            >
              {item}
            </Chip>
          )}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Parts List */}
      <FlatList
        data={parts}
        renderItem={renderPartItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.partRow}
        contentContainerStyle={styles.partsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loadingIndicator} />
          ) : null
        }
        onEndReached={() => {
          if (pagination.hasMore && !isLoading) {
            dispatch(fetchParts({ page: pagination.page + 1 }));
          }
        }}
        onEndReachedThreshold={0.1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 2,
  },
  categoriesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
  },
  partsList: {
    padding: 8,
  },
  partRow: {
    justifyContent: 'space-between',
  },
  partCard: {
    flex: 1,
    margin: 4,
    elevation: 2,
  },
  partContent: {
    padding: 12,
  },
  partTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  partBrand: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  partMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 2,
  },
  conditionChip: {
    height: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shipping: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingIndicator: {
    padding: 20,
  },
});

export default BrowsePartsScreen;