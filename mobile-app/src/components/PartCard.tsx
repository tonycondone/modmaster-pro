import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  Chip,
  IconButton,
  Surface,
  Avatar
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatCurrency } from '../utils/formatters';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface PartCardProps {
  part: {
    id: string;
    name: string;
    partNumber: string;
    manufacturer: string;
    category: string;
    price?: number;
    lowestPrice?: number;
    averageRating?: number;
    reviewCount?: number;
    images?: string[];
    compatibility?: string;
    availability?: string;
    isUniversal?: boolean;
  };
  vehicle?: any;
  onPress: () => void;
  onAddToCart?: () => void;
  variant?: 'default' | 'compact';
}

export const PartCard: React.FC<PartCardProps> = ({
  part,
  vehicle,
  onPress,
  onAddToCart,
  variant = 'default'
}) => {
  const theme = useTheme();

  const getCompatibilityColor = () => {
    if (!vehicle || part.isUniversal) return theme.colors.primary;
    
    switch (part.compatibility) {
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

  const getAvailabilityIcon = () => {
    switch (part.availability) {
      case 'in_stock':
        return 'check-circle';
      case 'limited':
        return 'alert-circle';
      case 'out_of_stock':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getAvailabilityColor = () => {
    switch (part.availability) {
      case 'in_stock':
        return theme.colors.primary;
      case 'limited':
        return theme.colors.tertiary;
      case 'out_of_stock':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <Card style={styles.compactCard} mode="outlined">
          <View style={styles.compactContent}>
            <Image
              source={{ uri: part.images?.[0] || 'https://via.placeholder.com/80' }}
              style={styles.compactImage}
            />
            <View style={styles.compactInfo}>
              <Text variant="labelLarge" numberOfLines={2} style={styles.compactName}>
                {part.name}
              </Text>
              <Text variant="labelSmall" style={styles.compactMeta}>
                {part.manufacturer}
              </Text>
              <View style={styles.compactFooter}>
                <Text variant="titleMedium" style={styles.price}>
                  {formatCurrency(part.price || part.lowestPrice || 0)}
                </Text>
                {part.averageRating && (
                  <View style={styles.rating}>
                    <MaterialCommunityIcons 
                      name="star" 
                      size={14} 
                      color="#FFD700" 
                    />
                    <Text variant="labelSmall">
                      {part.averageRating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Card style={styles.card} mode="elevated">
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: part.images?.[0] || 'https://via.placeholder.com/200' }}
            style={styles.image}
            resizeMode="cover"
          />
          {part.compatibility && vehicle && (
            <Surface style={[styles.compatibilityBadge, { backgroundColor: getCompatibilityColor() }]} elevation={2}>
              <MaterialCommunityIcons 
                name={part.compatibility === 'compatible' ? 'check' : part.compatibility === 'maybe' ? 'help' : 'close'} 
                size={16} 
                color="#fff" 
              />
            </Surface>
          )}
          <IconButton
            icon="heart-outline"
            size={20}
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              // Add to favorites
            }}
          />
        </View>

        <Card.Content style={styles.content}>
          <Text variant="labelSmall" style={styles.category}>
            {part.category}
          </Text>
          
          <Text variant="titleMedium" numberOfLines={2} style={styles.name}>
            {part.name}
          </Text>
          
          <View style={styles.meta}>
            <Text variant="bodySmall" style={styles.manufacturer}>
              {part.manufacturer}
            </Text>
            <Text variant="bodySmall" style={styles.partNumber}>
              #{part.partNumber}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <View>
              <Text variant="headlineSmall" style={styles.price}>
                {formatCurrency(part.price || part.lowestPrice || 0)}
              </Text>
              {part.lowestPrice && part.price && part.price > part.lowestPrice && (
                <Text variant="labelSmall" style={styles.comparePrice}>
                  as low as {formatCurrency(part.lowestPrice)}
                </Text>
              )}
            </View>
            
            <View style={styles.availability}>
              <MaterialCommunityIcons 
                name={getAvailabilityIcon()} 
                size={16} 
                color={getAvailabilityColor()} 
              />
              <Text variant="labelSmall" style={{ color: getAvailabilityColor() }}>
                {part.availability?.replace('_', ' ') || 'Check availability'}
              </Text>
            </View>
          </View>

          {part.averageRating && (
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialCommunityIcons
                    key={star}
                    name={star <= Math.round(part.averageRating!) ? 'star' : 'star-outline'}
                    size={14}
                    color="#FFD700"
                  />
                ))}
              </View>
              <Text variant="labelSmall" style={styles.reviewCount}>
                ({part.reviewCount || 0})
              </Text>
            </View>
          )}

          {part.isUniversal && (
            <Chip 
              compact 
              style={styles.universalChip}
              textStyle={styles.universalChipText}
              icon="check-all"
            >
              Universal Fit
            </Chip>
          )}
        </Card.Content>

        {onAddToCart && (
          <Card.Actions style={styles.actions}>
            <IconButton
              icon="cart-plus"
              size={24}
              mode="contained-tonal"
              onPress={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
            />
          </Card.Actions>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    width: CARD_WIDTH,
  },
  imageContainer: {
    position: 'relative',
    height: 150,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  compatibilityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    paddingTop: 12,
  },
  category: {
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  name: {
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  manufacturer: {
    opacity: 0.7,
  },
  partNumber: {
    opacity: 0.5,
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  comparePrice: {
    opacity: 0.6,
    marginTop: 2,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
  },
  reviewCount: {
    opacity: 0.6,
  },
  universalChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  universalChipText: {
    fontSize: 11,
    color: '#2196F3',
  },
  actions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  // Compact variant styles
  compactCard: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  compactContent: {
    flexDirection: 'row',
    padding: 12,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  compactName: {
    fontWeight: '600',
  },
  compactMeta: {
    opacity: 0.6,
    marginTop: 2,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});