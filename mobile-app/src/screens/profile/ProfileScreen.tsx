import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  Avatar,
  List,
  Divider,
  Button,
  Badge,
  ProgressBar,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { logout } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';

const ProfileScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.profile);
  const notificationCount = useAppSelector(state => state.user.notificationCount);
  const vehicleCount = useAppSelector(state => state.vehicles.vehicles.length);
  const scanCount = useAppSelector(state => state.scan.scanStats.totalScans);

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
      await dispatch(fetchUserProfile()).unwrap();
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handlers
  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleOrderHistory = () => {
    navigation.navigate('OrderHistory');
  };

  const handlePaymentMethods = () => {
    // TODO: Navigate to payment methods screen
    showToast('Payment methods screen coming soon', 'info');
  };

  const handleAddresses = () => {
    // TODO: Navigate to addresses screen
    showToast('Addresses screen coming soon', 'info');
  };

  const handleSubscription = () => {
    // TODO: Navigate to subscription screen
    showToast('Subscription management coming soon', 'info');
  };

  const handleSupport = () => {
    // TODO: Navigate to support screen
    showToast('Support screen coming soon', 'info');
  };

  const handleAbout = () => {
    // TODO: Navigate to about screen
    showToast('About screen coming soon', 'info');
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
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
              showToast('Logged out successfully', 'success');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const getSubscriptionColor = (plan?: string) => {
    switch (plan) {
      case 'premium':
        return '#FFD700';
      case 'basic':
        return '#C0C0C0';
      default:
        return '#CD7F32';
    }
  };

  const getSubscriptionIcon = (plan?: string) => {
    switch (plan) {
      case 'premium':
        return 'crown';
      case 'basic':
        return 'star';
      default:
        return 'account';
    }
  };

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
  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // 7. MAIN RENDER - MANDATORY
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <TouchableOpacity onPress={handleEditProfile}>
            <Avatar.Image
              size={80}
              source={
                user?.avatar
                  ? { uri: user.avatar }
                  : require('../../../assets/images/placeholder.png')
              }
              style={styles.avatar}
            />
            <View style={styles.editAvatarBadge}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.subscription && (
              <View style={styles.subscriptionBadge}>
                <MaterialCommunityIcons
                  name={getSubscriptionIcon(user.subscription.plan)}
                  size={16}
                  color={getSubscriptionColor(user.subscription.plan)}
                />
                <Text
                  style={[
                    styles.subscriptionText,
                    { color: getSubscriptionColor(user.subscription.plan) },
                  ]}
                >
                  {user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1)} Member
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="car" size={24} color="#0066CC" />
            <Text style={styles.statValue}>{vehicleCount}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="camera-iris" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{scanCount}</Text>
            <Text style={styles.statLabel}>Scans</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#FF6F00" />
            <Text style={styles.statValue}>{user?.stats?.orderCount || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Achievement Progress */}
      {user?.badges && user.badges.length > 0 && (
        <Card style={styles.achievementCard}>
          <Card.Content>
            <View style={styles.achievementHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.achievementCount}>
                {user.badges.length} Unlocked
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user.badges.map((badge) => (
                <View key={badge.id} style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <MaterialCommunityIcons
                      name={badge.icon as any}
                      size={32}
                      color="#FFD700"
                    />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
          </View>
              ))}
            </ScrollView>
        </Card.Content>
      </Card>
      )}

      {/* Menu Sections */}
      <Card style={styles.menuCard}>
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Order History"
            description="View all your past orders"
            left={(props) => <List.Icon {...props} icon="package-variant" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOrderHistory}
          />
          <Divider />
          <List.Item
            title="Payment Methods"
            description="Manage your payment options"
            left={(props) => <List.Icon {...props} icon="credit-card" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handlePaymentMethods}
          />
          <Divider />
          <List.Item
            title="Addresses"
            description="Manage shipping addresses"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleAddresses}
          />
        </List.Section>
      </Card>

      <Card style={styles.menuCard}>
        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item
            title="Notifications"
            description="Manage notification preferences"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <View style={styles.notificationBadgeContainer}>
                {notificationCount > 0 && (
                  <Badge style={styles.notificationBadge}>{notificationCount}</Badge>
                )}
                <List.Icon icon="chevron-right" />
              </View>
            )}
            onPress={handleNotifications}
          />
          <Divider />
          <List.Item
            title="Settings"
            description="App settings and preferences"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSettings}
          />
        </List.Section>
      </Card>

      {/* Subscription Card */}
      {user?.subscription && (
        <Card
          style={[
            styles.subscriptionCard,
            { borderColor: getSubscriptionColor(user.subscription.plan) },
          ]}
        >
        <Card.Content>
            <View style={styles.subscriptionHeader}>
              <MaterialCommunityIcons
                name={getSubscriptionIcon(user.subscription.plan)}
                size={32}
                color={getSubscriptionColor(user.subscription.plan)}
              />
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1)} Plan
                </Text>
                <Text style={styles.subscriptionStatus}>
                  {user.subscription.status === 'active' ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
            {user.subscription.expiresAt && (
              <Text style={styles.subscriptionExpiry}>
                Expires on {format(new Date(user.subscription.expiresAt), 'MMMM d, yyyy')}
              </Text>
            )}
            <Button
              mode="outlined"
              onPress={handleSubscription}
              style={styles.manageButton}
              textColor={getSubscriptionColor(user.subscription.plan)}
            >
              Manage Subscription
            </Button>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.menuCard}>
        <List.Section>
          <List.Subheader>Support</List.Subheader>
          <List.Item
            title="Help & Support"
            description="Get help with your account"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSupport}
          />
          <Divider />
          <List.Item
            title="About ModMaster Pro"
            description="Version 1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleAbout}
          />
        </List.Section>
      </Card>

      {/* Member Since */}
      {user?.createdAt && (
        <View style={styles.memberSince}>
          <MaterialCommunityIcons name="calendar-account" size={16} color="#666" />
          <Text style={styles.memberSinceText}>
            Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
          </Text>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#E0E0E0',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  subscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  editButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  achievementCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  achievementCount: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    alignItems: 'center',
    marginRight: 16,
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    width: 80,
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  notificationBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  subscriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionInfo: {
    marginLeft: 12,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  manageButton: {
    marginTop: 8,
    borderWidth: 2,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  memberSinceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});