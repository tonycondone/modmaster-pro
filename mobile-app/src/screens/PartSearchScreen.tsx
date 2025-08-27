import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Keyboard,
  RefreshControl
} from 'react-native';
import {
  Text,
  useTheme,
  Searchbar,
  Surface,
  Chip,
  IconButton,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  Button,
  RadioButton,
  Checkbox,
  List,
  Divider,
  Card,
  Avatar
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { RootState } from '../store';
import { searchParts, getCategories, clearSearch } from '../store/slices/partSlice';
import { PartCard } from '../components/PartCard';
import { FilterBottomSheet } from '../components/FilterBottomSheet';
import { formatCurrency } from '../utils/formatters';
import { debounce } from '../utils/helpers';

const { width } = Dimensions.get('window');

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
  { label: 'Rating', value: 'rating' },
  { label: 'Popularity', value: 'popularity' }
];

export const PartSearchScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { 
    searchResults, 
    isSearching, 
    categories,
    filters,
    pagination 
  } = useSelector((state: RootState) => state.parts);
  
  const { vehicles, currentVehicle } = useSelector((state: RootState) => state.vehicles);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('relevance');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(currentVehicle?.id || '');

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      performSearch(query);
    }, 500),
    [selectedCategories, priceRange, compatibleOnly, selectedVehicle]
  );

  useEffect(() => {
    // Load categories on mount
    dispatch(getCategories());
    
    return () => {
      dispatch(clearSearch());
    };
  }, []);

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  const performSearch = (query?: string) => {
    const params = {
      q: query || searchQuery,
      category: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      compatibleWith: compatibleOnly && selectedVehicle ? selectedVehicle : undefined,
      sort: selectedSort,
      page: 1,
      limit: 20
    };
    
    dispatch(searchParts(params));
  };

  const handleLoadMore = () => {
    if (!isSearching && pagination?.page < pagination?.pages) {
      dispatch(searchParts({
        q: searchQuery,
        page: pagination.page + 1
      }));
    }
  };

  const handleRefresh = () => {
    performSearch();
  };

  const handlePartPress = (part: any) => {
    navigation.navigate('PartDetail', { 
      partId: part.id,
      vehicleId: selectedVehicle 
    });
  };

  const handleFilterApply = () => {
    setShowFilters(false);
    performSearch();
  };

  const handleFilterReset = () => {
    setSelectedCategories([]);
    setPriceRange([0, 5000]);
    setCompatibleOnly(true);
    setSelectedVehicle(currentVehicle?.id || '');
    setShowFilters(false);
    performSearch();
  };

  const handleSortChange = (value: string) => {
    setSelectedSort(value);
    setShowSortModal(false);
    performSearch();
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (priceRange[0] > 0 || priceRange[1] < 5000) count++;
    if (!compatibleOnly) count++;
    if (selectedVehicle && selectedVehicle !== currentVehicle?.id) count++;
    return count;
  }, [selectedCategories, priceRange, compatibleOnly, selectedVehicle]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Searchbar
        placeholder="Search parts, brands, or part numbers..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon="magnify"
        clearIcon="close"
        onIconPress={() => {
          if (searchQuery) {
            Keyboard.dismiss();
            performSearch();
          }
        }}
      />
      
      <View style={styles.filterRow}>
        <Surface style={styles.filterChip} elevation={1}>
          <IconButton
            icon="filter-variant"
            size={20}
            onPress={() => setShowFilters(true)}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Surface>
        
        <Surface style={styles.sortChip} elevation={1}>
          <IconButton
            icon="sort"
            size={20}
            onPress={() => setShowSortModal(true)}
          />
          <Text variant="labelSmall" style={styles.sortLabel}>
            {SORT_OPTIONS.find(opt => opt.value === selectedSort)?.label}
          </Text>
        </Surface>
      </View>

      {selectedCategories.length > 0 && (
        <Animated.View 
          entering={FadeInDown} 
          exiting={FadeOutUp}
          style={styles.selectedFilters}
        >
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedCategories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Chip
                style={styles.filterChip}
                textStyle={styles.filterChipText}
                onClose={() => {
                  setSelectedCategories(prev => prev.filter(c => c !== item));
                  performSearch();
                }}
              >
                {item}
              </Chip>
            )}
          />
        </Animated.View>
      )}
    </View>
  );

  const renderPart = ({ item }: { item: any }) => (
    <PartCard
      part={item}
      vehicle={vehicles.find(v => v.id === selectedVehicle)}
      onPress={() => handlePartPress(item)}
      onAddToCart={() => {
        // Add to cart logic
      }}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="magnify-remove-outline" 
        size={80} 
        color={theme.colors.onSurfaceDisabled} 
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Parts Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {searchQuery 
          ? `No results for "${searchQuery}". Try adjusting your filters.`
          : 'Start searching for parts to see results.'}
      </Text>
      {searchQuery && (
        <Button 
          mode="outlined" 
          onPress={handleFilterReset}
          style={styles.resetButton}
        >
          Clear Filters
        </Button>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isSearching || searchResults.length === 0) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderPart}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isSearching && pagination?.page === 1}
            onRefresh={handleRefresh}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        stickyHeaderIndices={[0]}
      />

      {/* Quick Actions FAB */}
      <FAB
        icon="barcode-scan"
        style={styles.fab}
        onPress={() => navigation.navigate('BarcodeScan')}
        label="Scan Barcode"
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      >
        <View style={styles.filterContent}>
          <Text variant="titleMedium" style={styles.filterTitle}>
            Filters
          </Text>
          
          {/* Vehicle Selection */}
          <List.Section>
            <List.Subheader>Vehicle</List.Subheader>
            {vehicles.map(vehicle => (
              <List.Item
                key={vehicle.id}
                title={vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                description={`${vehicle.year} • ${formatMileage(vehicle.mileage)}`}
                left={() => (
                  <RadioButton
                    value={vehicle.id}
                    status={selectedVehicle === vehicle.id ? 'checked' : 'unchecked'}
                    onPress={() => setSelectedVehicle(vehicle.id)}
                  />
                )}
              />
            ))}
          </List.Section>
          
          <Divider />
          
          {/* Categories */}
          <List.Section>
            <List.Subheader>Categories</List.Subheader>
            <View style={styles.categoryGrid}>
              {categories.map(category => (
                <Chip
                  key={category.name}
                  selected={selectedCategories.includes(category.name)}
                  onPress={() => {
                    setSelectedCategories(prev =>
                      prev.includes(category.name)
                        ? prev.filter(c => c !== category.name)
                        : [...prev, category.name]
                    );
                  }}
                  style={styles.categoryChip}
                >
                  {category.name} ({category.count})
                </Chip>
              ))}
            </View>
          </List.Section>
          
          <Divider />
          
          {/* Price Range */}
          <List.Section>
            <List.Subheader>Price Range</List.Subheader>
            <View style={styles.priceInputs}>
              <TextInput
                label="Min Price"
                value={String(priceRange[0])}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  setPriceRange([value, priceRange[1]]);
                }}
                keyboardType="numeric"
                style={styles.priceInput}
              />
              <Text variant="bodyLarge" style={styles.priceSeparator}>-</Text>
              <TextInput
                label="Max Price"
                value={String(priceRange[1])}
                onChangeText={(text) => {
                  const value = parseInt(text) || 5000;
                  setPriceRange([priceRange[0], value]);
                }}
                keyboardType="numeric"
                style={styles.priceInput}
              />
            </View>
          </List.Section>
          
          <Divider />
          
          {/* Options */}
          <List.Section>
            <List.Item
              title="Compatible Parts Only"
              left={() => (
                <Checkbox
                  status={compatibleOnly ? 'checked' : 'unchecked'}
                  onPress={() => setCompatibleOnly(!compatibleOnly)}
                />
              )}
            />
          </List.Section>
        </View>
      </FilterBottomSheet>

      {/* Sort Modal */}
      <Portal>
        <Modal
          visible={showSortModal}
          onDismiss={() => setShowSortModal(false)}
          contentContainerStyle={styles.sortModal}
        >
          <Surface style={styles.sortModalContent} elevation={3}>
            <Text variant="titleMedium" style={styles.sortModalTitle}>
              Sort By
            </Text>
            <RadioButton.Group
              onValueChange={handleSortChange}
              value={selectedSort}
            >
              {SORT_OPTIONS.map(option => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  style={styles.sortOption}
                />
              ))}
            </RadioButton.Group>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingRight: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingRight: 16,
    flex: 1,
  },
  sortLabel: {
    marginLeft: -8,
  },
  selectedFilters: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  resetButton: {
    marginTop: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  filterContent: {
    padding: 16,
  },
  filterTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryChip: {
    marginBottom: 8,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  priceSeparator: {
    marginHorizontal: 8,
  },
  sortModal: {
    margin: 20,
  },
  sortModalContent: {
    borderRadius: 16,
    padding: 20,
  },
  sortModalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sortOption: {
    paddingVertical: 4,
  },
});