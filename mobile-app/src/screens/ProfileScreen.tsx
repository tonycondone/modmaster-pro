import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Avatar,
  Button,
  IconButton,
  List,
  Divider,
  Switch,
  Portal,
  Modal,
  TextInput,
  Chip,
  ProgressBar,
  FAB,
  Banner
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { RootState } from '../store';
import { logout, updateProfile } from '../store/slices/authSlice';
import { formatDate } from '../utils/formatters';

interface StatCard {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
}

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'bio' | 'location' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showBanner, setShowBanner] = useState(!user?.isVerified);

  const stats: StatCard[] = [
    {
      icon: 'car',
      value: vehicles.length,
      label: 'Vehicles',
      color: theme.colors.primary
    },
    {
      icon: 'camera-iris',
      value: user?.stats.totalScans || 0,
      label: 'Scans',
      color: theme.colors.secondary
    },
    {
      icon: 'folder-multiple',
      value: user?.stats.totalProjects || 0,
      label: 'Projects',
      color: theme.colors.tertiary
    },
    {
      icon: 'star',
      value: user?.stats.reputation || 0,
      label: 'Reputation',
      color: '#FFD700'
    }
  ];

  const subscriptionInfo = {
    free: {
      name: 'Free',
      features: ['5 scans/month', '1 vehicle', 'Basic recommendations'],
      nextTier: 'basic',
      progress: 0
    },
    basic: {
      name: 'Basic',
      features: ['50 scans/month', '3 vehicles', 'Advanced recommendations', 'Price tracking'],
      nextTier: 'pro',
      progress: 0.33
    },
    pro: {
      name: 'Pro',
      features: ['Unlimited scans', 'Unlimited vehicles', 'AI insights', 'Priority support', 'API access'],
      nextTier: 'enterprise',
      progress: 0.66
    },
    enterprise: {
      name: 'Enterprise',
      features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'Team management'],
      progress: 1
    }
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]) {
      // Upload image and update profile
      dispatch(updateProfile({ profilePicture: result.assets[0].uri }));
    }
  };

  const handleEditProfile = (field: 'name' | 'bio' | 'location') => {
    setEditField(field);
    setEditValue(
      field === 'name' ? `${user?.firstName} ${user?.lastName}` :
      field === 'bio' ? user?.bio || '' :
      user?.location || ''
    );
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editField) return;

    if (editField === 'name') {
      const [firstName, ...lastNameParts] = editValue.split(' ');
      dispatch(updateProfile({ 
        firstName, 
        lastName: lastNameParts.join(' ') 
      }));
    } else {
      dispatch(updateProfile({ [editField]: editValue }));
    }

    setEditModalVisible(false);
    setEditField(null);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }]
            });
          }
        }
      ]
    );
  };

  const currentSubscription = subscriptionInfo[user?.subscriptionTier || 'free'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Verification Banner */}
        {showBanner && (
          <Banner
            visible={true}
            actions={[
              {
                label: 'Verify Email',
                onPress: () => navigation.navigate('VerifyEmail'),
              },
              {
                label: 'Dismiss',
                onPress: () => setShowBanner(false),
              },
            ]}
            icon="email-alert"
            style={styles.banner}
          >
            Please verify your email to unlock all features.
          </Banner>
        )}

        {/* Profile Header */}
        <Surface style={styles.header} elevation={2}>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleImagePicker}>
              <Avatar.Image
                size={100}
                source={{ uri: user?.profilePicture || 'https://ui-avatars.com/api/?name=' + user?.username }}
                style={styles.avatar}
              />
              <Surface style={styles.editAvatarButton} elevation={3}>
                <MaterialCommunityIcons name="camera" size={20} color={theme.colors.primary} />
              </Surface>
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text variant="headlineMedium" style={styles.name}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => handleEditProfile('name')}
                />
              </View>
              <Text variant="bodyLarge" style={styles.username}>
                @{user?.username}
              </Text>
              {user?.bio && (
                <Text variant="bodyMedium" style={styles.bio}>
                  {user.bio}
                </Text>
              )}
              {user?.location && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons 
                    name="map-marker" 
                    size={16} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                  <Text variant="bodySmall" style={styles.location}>
                    {user.location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <Surface key={index} style={styles.statCard} elevation={1}>
                <MaterialCommunityIcons 
                  name={stat.icon} 
                  size={24} 
                  color={stat.color || theme.colors.primary} 
                />
                <Text variant="headlineSmall" style={styles.statValue}>
                  {stat.value}
                </Text>
                <Text variant="labelSmall" style={styles.statLabel}>
                  {stat.label}
                </Text>
              </Surface>
            ))}
          </View>
        </Surface>

        {/* Subscription Section */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Subscription
          </Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Chip 
                style={styles.tierChip}
                textStyle={styles.tierChipText}
                icon="crown"
              >
                {currentSubscription.name}
              </Chip>
              {user?.subscriptionTier !== 'enterprise' && (
                <Button 
                  mode="contained-tonal" 
                  onPress={() => navigation.navigate('Subscription')}
                  compact
                >
                  Upgrade
                </Button>
              )}
            </View>
            
            {user?.subscriptionTier !== 'enterprise' && (
              <View style={styles.progressSection}>
                <Text variant="labelSmall" style={styles.progressLabel}>
                  Progress to {subscriptionInfo[currentSubscription.nextTier || 'pro'].name}
                </Text>
                <ProgressBar 
                  progress={currentSubscription.progress} 
                  style={styles.progressBar}
                />
              </View>
            )}
            
            <View style={styles.featuresList}>
              {currentSubscription.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text variant="bodySmall" style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Surface>

        {/* Settings */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>
          
          <List.Item
            title="Notifications"
            description="Push notifications for scans and alerts"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Dark Mode"
            description="Use dark theme"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy"
    </List.Item>
            onPress={() => navigation.navigate('Privacy')}
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          
          <Divider />
          
          <List.Item
            title="Connected Accounts"
            description="Manage linked services"
            onPress={() => navigation.navigate('ConnectedAccounts')}
            left={(props) => <List.Icon {...props} icon="link-variant" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>

        {/* Support */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Support
          </Text>
          
          <List.Item
            title="Help Center"
            onPress={() => navigation.navigate('HelpCenter')}
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          
          <Divider />
          
          <List.Item
            title="Contact Support"
            onPress={() => navigation.navigate('ContactSupport')}
            left={(props) => <List.Icon {...props} icon="message-text" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          
          <Divider />
          
          <List.Item
            title="About"
            onPress={() => navigation.navigate('About')}
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </Surface>

        {/* Account Info */}
        <View style={styles.accountInfo}>
          <Text variant="labelSmall" style={styles.accountInfoText}>
            Account ID: {user?.id.slice(0, 8)}...
          </Text>
          <Text variant="labelSmall" style={styles.accountInfoText}>
            Member since {formatDate(user?.createdAt || new Date().toISOString())}
          </Text>
        </View>

        {/* Logout Button */}
        <Button 
          mode="outlined" 
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={theme.colors.error}
        >
          Logout
        </Button>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB for Quick Actions */}
      <FAB.Group
        open={false}
        visible
        icon="cog"
        actions={[
          {
            icon: 'car',
            label: 'Add Vehicle',
            onPress: () => navigation.navigate('AddVehicle'),
          },
          {
            icon: 'camera',
            label: 'New Scan',
            onPress: () => navigation.navigate('Scan'),
          },
          {
            icon: 'folder-plus',
            label: 'New Project',
            onPress: () => navigation.navigate('CreateProject'),
          },
        ]}
        onStateChange={() => {}}
        style={styles.fab}
      />

      {/* Edit Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Surface style={styles.modalContent} elevation={3}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              Edit {editField?.charAt(0).toUpperCase() + editField?.slice(1)}
            </Text>
            
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              label={editField?.charAt(0).toUpperCase() + editField?.slice(1)}
              mode="outlined"
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 3 : 1}
              style={styles.modalInput}
            />
            
            <View style={styles.modalActions}>
              <Button onPress={() => setEditModalVisible(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSaveEdit}>
                Save
              </Button>
            </View>
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
  banner: {
    backgroundColor: '#FFF3CD',
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  username: {
    opacity: 0.7,
    marginTop: 4,
  },
  bio: {
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  location: {
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  subscriptionCard: {
    padding: 16,
    paddingTop: 0,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierChip: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  tierChipText: {
    color: '#FFB800',
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    opacity: 0.6,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    flex: 1,
  },
  accountInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  accountInfoText: {
    opacity: 0.5,
    marginVertical: 2,
  },
  logoutButton: {
    marginHorizontal: 32,
    marginBottom: 16,
    borderColor: 'red',
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    margin: 20,
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});