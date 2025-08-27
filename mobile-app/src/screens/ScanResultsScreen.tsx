import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Share
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Chip,
  Button,
  IconButton,
  FAB,
  Portal,
  Modal,
  List,
  Divider,
  Avatar,
  Card,
  Badge
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../store';
import { PartDetailModal } from '../components/PartDetailModal';
import { formatCurrency } from '../utils/formatters';

const { width } = Dimensions.get('window');

interface ScanResultsScreenProps {
  route: {
    params: {
      scanId: string;
      vehicleId: string;
      scanType: string;
      results?: any;
    };
  };
}

interface IdentifiedPart {
  id: string;
  boundingBox: number[];
  confidence: number;
  partDetails: {
    id: string;
    name: string;
    partNumber: string;
    manufacturer: string;
    category: string;
    price?: number;
    compatibility: 'compatible' | 'maybe' | 'incompatible';
  };
}

export const ScanResultsScreen: React.FC<ScanResultsScreenProps> = ({ route }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { scanId, vehicleId, scanType } = route.params;
  
  const [selectedPart, setSelectedPart] = useState<IdentifiedPart | null>(null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Mock results for demo
  const scanResults = {
    imageUrl: 'https://example.com/scan-image.jpg',
    identifiedParts: [
      {
        id: '1',
        boundingBox: [100, 100, 200, 200],
        confidence: 0.95,
        partDetails: {
          id: 'part-1',
          name: 'K&N Cold Air Intake',
          partNumber: 'KN-69-2543',
          manufacturer: 'K&N',
          category: 'Air Intake',
          price: 299.99,
          compatibility: 'compatible'
        }
      },
      {
        id: '2',
        boundingBox: [300, 150, 150, 150],
        confidence: 0.87,
        partDetails: {
          id: 'part-2',
          name: 'Mishimoto Aluminum Radiator',
          partNumber: 'MMRAD-MUS-05',
          manufacturer: 'Mishimoto',
          category: 'Cooling',
          price: 449.99,
          compatibility: 'compatible'
        }
      },
      {
        id: '3',
        boundingBox: [150, 300, 180, 120],
        confidence: 0.78,
        partDetails: {
          id: 'part-3',
          name: 'NGK Spark Plugs',
          partNumber: 'NGK-BKR7E',
          manufacturer: 'NGK',
          category: 'Ignition',
          price: 24.99,
          compatibility: 'maybe'
        }
      }
    ] as IdentifiedPart[],
    aiInsights: {
      overallCondition: 'good',
      recommendations: [
        'Consider upgrading your air filter for better performance',
        'Coolant system appears to be in good condition',
        'Spark plugs may need replacement soon'
      ],
      estimatedValue: 2450.00
    }
  };

  const getCompatibilityColor = (compatibility: string) => {
    switch (compatibility) {
      case 'compatible':
        return theme.colors.primary;
      case 'maybe':
        return theme.colors.tertiary;
      case 'incompatible':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getCompatibilityIcon = (compatibility: string) => {
    switch (compatibility) {
      case 'compatible':
        return 'check-circle';
      case 'maybe':
        return 'help-circle';
      case 'incompatible':
        return 'close-circle';
      default:
        return 'circle';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ModMaster Pro scan results! Found ${scanResults.identifiedParts.length} parts.`,
        title: 'ModMaster Pro Scan Results'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSaveProject = () => {
    navigation.navigate('CreateProject', {
      fromScan: true,
      scanId,
      vehicleId,
      suggestedParts: scanResults.identifiedParts.map(p => p.partDetails)
    });
  };

  const handlePartPress = (part: IdentifiedPart) => {
    setSelectedPart(part);
    setShowPartModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <TouchableOpacity onPress={() => setShowImageModal(true)}>
          <Surface style={styles.imageContainer} elevation={2}>
            <Image
              source={{ uri: scanResults.imageUrl }}
              style={styles.scanImage}
              resizeMode="cover"
            />
            {/* Bounding Boxes Overlay */}
            {scanResults.identifiedParts.map((part, index) => (
              <TouchableOpacity
                key={part.id}
                style={[
                  styles.boundingBox,
                  {
                    left: part.boundingBox[0],
                    top: part.boundingBox[1],
                    width: part.boundingBox[2],
                    height: part.boundingBox[3],
                    borderColor: getCompatibilityColor(part.partDetails.compatibility)
                  }
                ]}
                onPress={() => handlePartPress(part)}
              >
                <Badge style={styles.partBadge}>{index + 1}</Badge>
              </TouchableOpacity>
            ))}
            <Chip 
              style={styles.imageChip} 
              icon="magnify-plus"
              compact
            >
              Tap to zoom
            </Chip>
          </Surface>
        </TouchableOpacity>

        {/* Summary Card */}
        <Surface style={styles.summaryCard} elevation={1}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons 
              name="check-decagram" 
              size={32} 
              color={theme.colors.primary} 
            />
            <View style={styles.summaryContent}>
              <Text variant="titleLarge" style={styles.summaryTitle}>
                {scanResults.identifiedParts.length} Parts Identified
              </Text>
              <Text variant="bodyMedium" style={styles.summarySubtitle}>
                {scanType.replace('_', ' ').charAt(0).toUpperCase() + scanType.slice(1)} scan completed
              </Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {Math.round(scanResults.identifiedParts.reduce((acc, p) => acc + p.confidence, 0) / scanResults.identifiedParts.length * 100)}%
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                Avg Confidence
              </Text>
            </View>
            <Divider style={styles.verticalDivider} />
            <View style={styles.stat}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {formatCurrency(scanResults.aiInsights.estimatedValue)}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                Est. Value
              </Text>
            </View>
          </View>
        </Surface>

        {/* AI Insights */}
        <Surface style={styles.insightsCard} elevation={1}>
          <View style={styles.insightsHeader}>
            <MaterialCommunityIcons 
              name="brain" 
              size={24} 
              color={theme.colors.primary} 
            />
            <Text variant="titleMedium" style={styles.insightsTitle}>
              AI Insights
            </Text>
          </View>
          {scanResults.aiInsights.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.insightItem}>
              <MaterialCommunityIcons 
                name="lightbulb-outline" 
                size={20} 
                color={theme.colors.tertiary} 
              />
              <Text variant="bodyMedium" style={styles.insightText}>
                {recommendation}
              </Text>
            </View>
          ))}
        </Surface>

        {/* Identified Parts List */}
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Identified Parts
        </Text>
        
        {scanResults.identifiedParts.map((part, index) => (
          <Card
            key={part.id}
            style={styles.partCard}
            onPress={() => handlePartPress(part)}
            mode="outlined"
          >
            <Card.Content style={styles.partCardContent}>
              <View style={styles.partNumber}>
                <Avatar.Text 
                  size={36} 
                  label={String(index + 1)}
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
              </View>
              
              <View style={styles.partInfo}>
                <Text variant="titleMedium" style={styles.partName}>
                  {part.partDetails.name}
                </Text>
                <Text variant="bodySmall" style={styles.partMeta}>
                  {part.partDetails.manufacturer} • {part.partDetails.partNumber}
                </Text>
                <View style={styles.partTags}>
                  <Chip 
                    compact 
                    style={styles.categoryChip}
                    textStyle={styles.chipText}
                  >
                    {part.partDetails.category}
                  </Chip>
                  <Chip 
                    compact
                    icon={getCompatibilityIcon(part.partDetails.compatibility)}
                    style={[
                      styles.compatibilityChip,
                      { backgroundColor: getCompatibilityColor(part.partDetails.compatibility) + '20' }
                    ]}
                    textStyle={[
                      styles.chipText,
                      { color: getCompatibilityColor(part.partDetails.compatibility) }
                    ]}
                  >
                    {part.confidence > 0.9 ? 'High' : 'Medium'} Match
                  </Chip>
                </View>
              </View>
              
              <View style={styles.partActions}>
                {part.partDetails.price && (
                  <Text variant="titleMedium" style={styles.partPrice}>
                    {formatCurrency(part.partDetails.price)}
                  </Text>
                )}
                <IconButton
                  icon="chevron-right"
                  size={24}
                  onPress={() => handlePartPress(part)}
                />
              </View>
            </Card.Content>
          </Card>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB Menu */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            {
              icon: 'content-save',
              label: 'Save Results',
              onPress: () => console.log('Save results'),
            },
            {
              icon: 'share-variant',
              label: 'Share',
              onPress: handleShare,
            },
            {
              icon: 'folder-plus',
              label: 'Create Project',
              onPress: handleSaveProject,
            },
            {
              icon: 'cart-plus',
              label: 'Add All to Cart',
              onPress: () => console.log('Add to cart'),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>

      {/* Part Detail Modal */}
      <PartDetailModal
        visible={showPartModal}
        part={selectedPart?.partDetails}
        onDismiss={() => setShowPartModal(false)}
        onAddToCart={() => {
          setShowPartModal(false);
          // Add to cart logic
        }}
        onViewDetails={() => {
          setShowPartModal(false);
          navigation.navigate('PartDetail', { 
            partId: selectedPart?.partDetails.id 
          });
        }}
      />

      {/* Full Image Modal */}
      <Portal>
        <Modal
          visible={showImageModal}
          onDismiss={() => setShowImageModal(false)}
          contentContainerStyle={styles.imageModal}
        >
          <Image
            source={{ uri: scanResults.imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <IconButton
            icon="close"
            size={24}
            onPress={() => setShowImageModal(false)}
            style={styles.closeButton}
            iconColor="#fff"
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  scanImage: {
    width: '100%',
    height: 250,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  partBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  imageChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryTitle: {
    fontWeight: 'bold',
  },
  summarySubtitle: {
    opacity: 0.7,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  insightsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightText: {
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  partCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  partCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partNumber: {
    marginRight: 12,
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontWeight: '600',
  },
  partMeta: {
    opacity: 0.6,
    marginTop: 2,
  },
  partTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    height: 24,
  },
  compatibilityChip: {
    height: 24,
  },
  chipText: {
    fontSize: 11,
  },
  partActions: {
    alignItems: 'flex-end',
  },
  partPrice: {
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 100,
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});