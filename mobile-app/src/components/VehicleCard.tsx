import React from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  IconButton,
  Chip,
  Surface
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { SharedElement } from 'react-navigation-shared-element';

interface VehicleCardProps {
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    nickname?: string;
    mileage?: number;
    images?: string[];
    isPrimary?: boolean;
    modifications?: any[];
    totalInvested?: number;
  };
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export const VehicleCard: React.FC<VehicleCardProps> = ({ 
  vehicle, 
  onPress, 
  onEdit, 
  onDelete 
}) => {
  const theme = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('VehicleDetail', { vehicleId: vehicle.id });
    }
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat().format(mileage);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Card style={styles.card} mode="elevated">
        <SharedElement id={`vehicle.${vehicle.id}.image`}>
          <Card.Cover 
            source={{ 
              uri: vehicle.images?.[0] || 'https://via.placeholder.com/400x250' 
            }} 
            style={styles.cover}
          />
        </SharedElement>

        {vehicle.isPrimary && (
          <Surface style={styles.primaryBadge} elevation={3}>
            <MaterialCommunityIcons 
              name="star" 
              size={16} 
              color={theme.colors.primary} 
            />
            <Text variant="labelSmall" style={styles.primaryText}>
              Primary
            </Text>
          </Surface>
        )}

        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <SharedElement id={`vehicle.${vehicle.id}.title`}>
                <Text variant="titleLarge" style={styles.title}>
                  {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                </Text>
              </SharedElement>
              {vehicle.nickname && (
                <Text variant="bodyMedium" style={styles.subtitle}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Text>
              )}
            </View>
            <View style={styles.actions}>
              {onEdit && (
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                />
              )}
              {onDelete && (
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.stats}>
            {vehicle.mileage && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons 
                  name="speedometer" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {formatMileage(vehicle.mileage)} mi
                </Text>
              </View>
            )}

            {vehicle.modifications && vehicle.modifications.length > 0 && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons 
                  name="wrench" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {vehicle.modifications.length} mods
                </Text>
              </View>
            )}

            {vehicle.totalInvested && vehicle.totalInvested > 0 && (
              <View style={styles.statItem}>
                <MaterialCommunityIcons 
                  name="cash" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {formatCurrency(vehicle.totalInvested)}
                </Text>
              </View>
            )}
          </View>

          {vehicle.modifications && vehicle.modifications.length > 0 && (
            <View style={styles.modsPreview}>
              <Text variant="labelSmall" style={styles.modsLabel}>
                Recent Mods:
              </Text>
              <View style={styles.modChips}>
                {vehicle.modifications.slice(0, 3).map((mod, index) => (
                  <Chip 
                    key={index} 
                    compact
                    style={styles.modChip}
                    textStyle={styles.modChipText}
                  >
                    {mod.partName || mod.name}
                  </Chip>
                ))}
                {vehicle.modifications.length > 3 && (
                  <Text variant="labelSmall" style={styles.moreText}>
                    +{vehicle.modifications.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  cover: {
    height: 200,
  },
  primaryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  primaryText: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  content: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginRight: -8,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    opacity: 0.8,
  },
  modsPreview: {
    marginTop: 16,
  },
  modsLabel: {
    opacity: 0.7,
    marginBottom: 8,
  },
  modChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  modChip: {
    height: 24,
  },
  modChipText: {
    fontSize: 11,
  },
  moreText: {
    opacity: 0.6,
    marginLeft: 4,
  },
});