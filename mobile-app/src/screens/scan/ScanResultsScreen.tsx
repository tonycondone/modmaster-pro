import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { fetchScanResults, saveScan } from '../../store/slices/scanSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { showToast } from '../../utils/toast';
import LottieView from 'lottie-react-native';

type RouteParams = {
  ScanResults: {
    scanId: string;
  };
};

interface IdentifiedPart {
  id: string;
  name: string;
  category: string;
  confidence: number;
  price: number;
  inStock: boolean;
  image: string;
  compatibleVehicles: string[];
  description: string;
}

const ScanResultsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const route = useRoute<RouteProp<RouteParams, 'ScanResults'>>();
  const { scanId } = route.params;
  
  const { currentScan, isLoading } = useSelector((state: RootState) => state.scan);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showAllParts, setShowAllParts] = useState(false);

  useEffect(() => {
    loadScanResults();
  }, [scanId]);

  const loadScanResults = async () => {
    try {
      await dispatch(fetchScanResults(scanId)).unwrap();
    } catch (error) {
      showToast('Failed to load scan results', 'error');
      navigation.goBack();
    }
  };

  const handleAddToCart = async (part: IdentifiedPart) => {
    try {
      await dispatch(addToCart({
        partId: part.id,
        quantity: 1,
        price: part.price,
      })).unwrap();
      showToast(`${part.name} added to cart`, 'success');
    } catch (error) {
      showToast('Failed to add to cart', 'error');
    }
  };

  const handleSaveScan = async () => {
    try {
      await dispatch(saveScan(scanId)).unwrap();
      showToast('Scan saved to history', 'success');
    } catch (error) {
      showToast('Failed to save scan', 'error');
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = `Check out these parts I found with ModMaster Pro:\n\n${
        currentScan?.identifiedParts
          .slice(0, 3)
          .map(p => `• ${p.name} (${Math.round(p.confidence * 100)}% match)`)
          .join('\n')
      }\n\nDownload ModMaster Pro to scan your vehicle parts!`;
      
      await Share.share({
        message: shareMessage,
        url: currentScan?.scanImage,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFeedback = (isAccurate: boolean) => {
    Alert.alert(
      isAccurate ? 'Thank You!' : 'Help Us Improve',
      isAccurate
        ? 'Your feedback helps us improve our AI accuracy.'
        : 'Please tell us what was incorrect so we can improve.',
      [
        {
          text: 'OK',
          onPress: () => {
            setFeedbackSent(true);
            // Send feedback to backend
          },
        },
      ]
    );
  };

  const handleRescan = () => {
    navigation.navigate('ScanPreview');
  };

  const renderConfidenceBar = (confidence: number) => {
    const color =
      confidence >= 0.8 ? '#4CAF50' :
      confidence >= 0.6 ? '#FF9800' :
      '#F44336';
    
    return (
      <View style={styles.confidenceBar}>
        <View
          style={[
            styles.confidenceBarFill,
            {
              width: `${confidence * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    );
  };

  const renderPartCard = (part: IdentifiedPart, index: number) => {
    const isCompatible = selectedVehicle
      ? part.compatibleVehicles.includes(selectedVehicle)
      : true;
    
    return (
      <TouchableOpacity
        key={part.id}
        style={[
          styles.partCard,
          !isCompatible && styles.incompatibleCard,
        ]}
        onPress={() => navigation.navigate('PartDetails', { partId: part.id })}
      >
        <View style={styles.partRank}>
          <Text style={styles.partRankText}>#{index + 1}</Text>
        </View>
        
        <Image source={{ uri: part.image }} style={styles.partImage} />
        
        <View style={styles.partInfo}>
          <Text style={styles.partName} numberOfLines={2}>
            {part.name}
          </Text>
          
          <Text style={styles.partCategory}>{part.category}</Text>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceText}>
              {Math.round(part.confidence * 100)}% match
            </Text>
            {renderConfidenceBar(part.confidence)}
          </View>
          
          {!isCompatible && (
            <View style={styles.incompatibleBadge}>
              <Icon name="alert" size={12} color="#FF6B6B" />
              <Text style={styles.incompatibleText}>
                Not compatible with selected vehicle
              </Text>
            </View>
          )}
          
          <View style={styles.partActions}>
            <Text style={styles.partPrice}>${part.price.toFixed(2)}</Text>
            
            {part.inStock ? (
              <TouchableOpacity
                style={[styles.addToCartButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleAddToCart(part)}
                disabled={!isCompatible}
              >
                <Icon name="cart-plus" size={16} color="#FFF" />
                <Text style={styles.addToCartText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading || !currentScan) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/animations/analyzing-animation.json')}
          autoPlay
          loop
          style={styles.analyzingAnimation}
        />
        <Text style={styles.loadingText}>Analyzing your image...</Text>
        <Text style={styles.loadingSubtext}>
          Our AI is identifying parts in your scan
        </Text>
      </View>
    );
  }

  const displayedParts = showAllParts
    ? currentScan.identifiedParts
    : currentScan.identifiedParts.slice(0, 3);

  return (
    <ScrollView style={styles.container}>
      {/* Scan Image */}
      <View style={styles.scanImageContainer}>
        <Image
          source={{ uri: currentScan.scanImage }}
          style={styles.scanImage}
          resizeMode="cover"
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanStats}>
            <View style={styles.statItem}>
              <Icon name="puzzle" size={20} color="#FFF" />
              <Text style={styles.statText}>
                {currentScan.identifiedParts.length} parts found
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>
                {currentScan.processingTime}s
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Vehicle Filter */}
      {vehicles.length > 0 && (
        <View style={styles.vehicleFilter}>
          <Text style={styles.filterLabel}>Filter by vehicle:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.vehicleChips}
          >
            <TouchableOpacity
              style={[
                styles.vehicleChip,
                !selectedVehicle && styles.activeVehicleChip,
              ]}
              onPress={() => setSelectedVehicle(null)}
            >
              <Text
                style={[
                  styles.vehicleChipText,
                  !selectedVehicle && styles.activeVehicleChipText,
                ]}
              >
                All Vehicles
              </Text>
            </TouchableOpacity>
            
            {vehicles.map(vehicle => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleChip,
                  selectedVehicle === vehicle.id && styles.activeVehicleChip,
                ]}
                onPress={() => setSelectedVehicle(vehicle.id)}
              >
                <Text
                  style={[
                    styles.vehicleChipText,
                    selectedVehicle === vehicle.id && styles.activeVehicleChipText,
                  ]}
                >
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Identified Parts */}
      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Identified Parts</Text>
        
        {displayedParts.map((part, index) => renderPartCard(part, index))}
        
        {currentScan.identifiedParts.length > 3 && !showAllParts && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAllParts(true)}
          >
            <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
              Show {currentScan.identifiedParts.length - 3} more parts
            </Text>
            <Icon name="chevron-down" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Recommendations */}
      {currentScan.recommendations && currentScan.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {currentScan.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Icon name="lightbulb-outline" size={20} color="#FF9800" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSaveScan}
        >
          <Icon name="content-save" size={20} color="#FFF" />
          <Text style={styles.primaryButtonText}>Save to History</Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
            <Icon name="share-variant" size={20} color="#666" />
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRescan}>
            <Icon name="camera-retake" size={20} color="#666" />
            <Text style={styles.secondaryButtonText}>Rescan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feedback */}
      {!feedbackSent && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>How accurate were these results?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.positiveFeedback]}
              onPress={() => handleFeedback(true)}
            >
              <Icon name="thumb-up" size={20} color="#4CAF50" />
              <Text style={styles.feedbackButtonText}>Accurate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.feedbackButton, styles.negativeFeedback]}
              onPress={() => handleFeedback(false)}
            >
              <Icon name="thumb-down" size={20} color="#F44336" />
              <Text style={styles.feedbackButtonText}>Not Accurate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
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
    backgroundColor: '#F5F5F5',
  },
  analyzingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  scanImageContainer: {
    height: 250,
    position: 'relative',
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
  },
  vehicleFilter: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  vehicleChips: {
    flexDirection: 'row',
  },
  vehicleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  activeVehicleChip: {
    backgroundColor: '#0066CC',
  },
  vehicleChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeVehicleChipText: {
    color: '#FFF',
    fontWeight: '500',
  },
  resultsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  partCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incompatibleCard: {
    opacity: 0.7,
  },
  partRank: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0066CC',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  partImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  confidenceContainer: {
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  confidenceBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  incompatibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  incompatibleText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
  },
  partActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addToCartText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  outOfStockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
  },
  outOfStockText: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  recommendationsSection: {
    padding: 16,
    backgroundColor: '#FFF8E1',
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
  },
  primaryButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  feedbackSection: {
    padding: 16,
    backgroundColor: '#FFF',
    marginTop: 16,
    marginBottom: 32,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  positiveFeedback: {
    borderColor: '#4CAF50',
  },
  negativeFeedback: {
    borderColor: '#F44336',
  },
  feedbackButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
});

export default ScanResultsScreen;