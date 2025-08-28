import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip, FAB } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchParts, clearSearchResults } from '../../store/slices/partsSlice';
import { Part } from '../../store/slices/partsSlice';
import { showToast } from '../../utils/toast';

type RouteParams = {
  Search: {
    query?: string;
    category?: string;
  };
};

interface SearchHistory {
  query: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 10;

const SearchScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchHistory[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const { searchResults, searchLoading, error: searchError } = useAppSelector(state => state.parts);
  const cartItems = useAppSelector(state => state.cart.items);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'Search'>>();

  // Popular searches
  const popularSearches = [
    'Oil Filter',
    'Brake Pads',
    'Battery',
    'Air Filter',
    'Spark Plugs',
    'Windshield Wipers',
    'Headlight Bulbs',
    'Engine Oil',
  ];

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    loadRecentSearches();
    
    // If query passed from navigation, perform search
    if (route.params?.query) {
      setSearchQuery(route.params.query);
      handleSearch(route.params.query);
    }
    
    // Focus search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    
    return () => {
      dispatch(clearSearchResults());
    };
  }, []);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveSearchToHistory = async (query: string) => {
    try {
      const newSearch: SearchHistory = {
        query,
        timestamp: Date.now(),
      };
      
      // Remove duplicate if exists
      const filteredSearches = recentSearches.filter(s => s.query !== query);
      
      // Add new search at beginning
      const updatedSearches = [newSearch, ...filteredSearches].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
      showToast('Search history cleared', 'success');
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  // Handlers
  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery.trim();
    
    if (!searchTerm) {
      showToast('Please enter a search term', 'error');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await dispatch(searchParts(searchTerm)).unwrap();
      await saveSearchToHistory(searchTerm);
    } catch (err: any) {
      setError(err.message || 'Failed to search parts');
      Alert.alert('Error', 'Failed to search parts');
    } finally {
      setLoading(false);
    }
  };

  const handlePartPress = (part: Part) => {
    navigation.navigate('PartDetails', { partId: part.id });
  };

  const handleVoiceSearch = async () => {
    // TODO: Implement voice search with speech recognition
    showToast('Voice search coming soon', 'info');
    
    // For now, just speak a demo message
    setIsListening(true);
    Speech.speak('Voice search feature is coming soon', {
      onDone: () => setIsListening(false),
    });
  };

  const handleBarcodeScan = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      setShowScanner(true);
      setScanned(false);
    } else {
      Alert.alert('Permission Denied', 'Camera permission is required for barcode scanning');
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setShowScanner(false);
    setSearchQuery(data);
    handleSearch(data);
  };

  const renderSearchResult = ({ item }: { item: Part }) => (
    <TouchableOpacity onPress={() => handlePartPress(item)}>
      <Card style={styles.resultCard}>
        <Card.Content style={styles.resultContent}>
          <Image source={{ uri: item.images[0] }} style={styles.resultImage} />
          <View style={styles.resultInfo}>
            <Text style={styles.resultBrand}>{item.brand}</Text>
            <Text style={styles.resultName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.resultPartNumber}>Part # {item.partNumber}</Text>
            <View style={styles.resultPriceRow}>
              <Text style={styles.resultPrice}>${item.price.toFixed(2)}</Text>
              {item.oldPrice && (
                <Text style={styles.resultOldPrice}>${item.oldPrice.toFixed(2)}</Text>
              )}
            </View>
            <View style={styles.resultRating}>
              <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
              <Text style={styles.resultRatingText}>
                {item.rating.toFixed(1)} ({item.reviewCount})
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: SearchHistory }) => (
    <TouchableOpacity
      style={styles.recentSearchItem}
      onPress={() => {
        setSearchQuery(item.query);
        handleSearch(item.query);
      }}
    >
      <MaterialCommunityIcons name="history" size={20} color="#666" />
      <Text style={styles.recentSearchText}>{item.query}</Text>
    </TouchableOpacity>
  );

  // 5. ERROR HANDLING - MANDATORY
  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => handleSearch()}>
          <Text style={styles.retryButtonText}>Retry Search</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scanner View
  if (showScanner) {
    return (
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarcodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setShowScanner(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Barcode</Text>
          </View>
          <View style={styles.scannerGuide}>
            <View style={styles.scannerCorner} />
          </View>
          <Text style={styles.scannerText}>
            Align barcode within the frame to scan
          </Text>
        </View>
      </View>
    );
  }

  // 6. LOADING STATE - MANDATORY
  const isSearching = loading || searchLoading;

  // 7. MAIN RENDER - MANDATORY
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for parts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={handleVoiceSearch}
          disabled={isListening}
        >
          <MaterialCommunityIcons
            name={isListening ? 'microphone' : 'microphone-outline'}
            size={24}
            color={isListening ? '#FF3B30' : '#666'}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.scanButton} onPress={handleBarcodeScan}>
          <MaterialCommunityIcons name="barcode-scan" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {searchResults.length} results for "{searchQuery}"
            </Text>
          }
        />
      ) : isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchQuery && !isSearching ? (
        <View style={styles.noResultsContainer}>
          <MaterialCommunityIcons name="magnify-close" size={64} color="#999" />
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsText}>
            Try adjusting your search terms or browse our categories
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('BrowseParts')}
          >
            <Text style={styles.browseButtonText}>Browse Parts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.suggestionsContainer}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={(item) => item.timestamp.toString()}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.chipsContainer}>
              {popularSearches.map((search) => (
                <Chip
                  key={search}
                  style={styles.searchChip}
                  onPress={() => {
                    setSearchQuery(search);
                    handleSearch(search);
                  }}
                >
                  {search}
                </Chip>
              ))}
            </View>
          </View>

          {/* Search Tips */}
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text style={styles.tipsTitle}>Search Tips</Text>
              <View style={styles.tipRow}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.tipText}>Use specific part numbers for exact matches</Text>
              </View>
              <View style={styles.tipRow}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.tipText}>Include your vehicle make and model</Text>
              </View>
              <View style={styles.tipRow}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.tipText}>Try scanning barcodes for quick searches</Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      {/* Cart FAB */}
      {cartItems.length > 0 && (
        <FAB
          style={styles.fab}
          icon="cart"
          onPress={() => navigation.navigate('Cart')}
          label={`Cart (${cartItems.length})`}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  voiceButton: {
    marginLeft: 12,
    padding: 8,
  },
  scanButton: {
    marginLeft: 8,
    padding: 8,
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
  resultsList: {
    padding: 16,
    paddingBottom: 100,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  resultCard: {
    marginBottom: 12,
    elevation: 2,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultBrand: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 2,
  },
  resultPartNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  resultOldPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resultRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#0066CC',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentSearchText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  searchChip: {
    margin: 4,
  },
  tipsCard: {
    margin: 16,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  scannerCloseButton: {
    padding: 8,
  },
  scannerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 16,
  },
  scannerGuide: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    alignSelf: 'center',
  },
  scannerCorner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#0066CC',
  },
  scannerText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingBottom: 50,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
  },
});