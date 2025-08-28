import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '../../theme';
import QuickActionCard from '../../components/QuickActionCard';
import VehicleCard from '../../components/VehicleCard';
import RecentScanCard from '../../components/RecentScanCard';
import StatsCard from '../../components/StatsCard';
import { fetchUserVehicles } from '../../store/slices/vehicleSlice';
import { fetchRecentScans } from '../../store/slices/scanSlice';
import { fetchUserStats } from '../../store/slices/userSlice';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useSelector((state: any) => state.auth);
  const { vehicles, primaryVehicle } = useSelector((state: any) => state.vehicles);
  const { recentScans } = useSelector((state: any) => state.scans);
  const { stats } = useSelector((state: any) => state.user);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchUserVehicles()),
        dispatch(fetchRecentScans({ limit: 5 })),
        dispatch(fetchUserStats())
      ]);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAction = async (action: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (action) {
      case 'scan':
        navigation.navigate('ScanScreen');
        break;
      case 'vehicles':
        navigation.navigate('VehiclesScreen');
        break;
      case 'marketplace':
        navigation.navigate('MarketplaceScreen');
        break;
      case 'history':
        navigation.navigate('ScanHistoryScreen');
        break;
    }
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 100],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
            opacity: headerOpacity
          }
        ]}
      >
        <LinearGradient
          colors={['#e94560', '#ff6b6b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>
                  {getGreeting()}, {user?.first_name || 'User'}!
                </Text>
                <Text style={styles.subGreeting}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => navigation.navigate('NotificationsScreen')}
              >
                <Icon name="bell-outline" size={24} color={colors.white} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>3</Text>
                </View>
              </TouchableOpacity>
            </View>

            {primaryVehicle && (
              <TouchableOpacity
                style={styles.primaryVehicleInfo}
                onPress={() => navigation.navigate('VehicleDetails', { vehicleId: primaryVehicle.id })}
              >
                <Icon name="car" size={20} color={colors.white} />
                <Text style={styles.primaryVehicleText}>
                  {primaryVehicle.year} {primaryVehicle.make} {primaryVehicle.model}
                </Text>
                <Icon name="chevron-right" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="camera"
              title="Scan Part"
              color="#e94560"
              onPress={() => handleQuickAction('scan')}
            />
            <QuickActionCard
              icon="car-multiple"
              title="My Vehicles"
              color="#4361ee"
              onPress={() => handleQuickAction('vehicles')}
            />
            <QuickActionCard
              icon="shopping"
              title="Marketplace"
              color="#f72585"
              onPress={() => handleQuickAction('marketplace')}
            />
            <QuickActionCard
              icon="history"
              title="Scan History"
              color="#7209b7"
              onPress={() => handleQuickAction('history')}
            />
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            <StatsCard
              icon="car"
              title="Vehicles"
              value={stats?.vehicles || 0}
              color="#4361ee"
            />
            <StatsCard
              icon="scan-helper"
              title="Total Scans"
              value={stats?.total_scans || 0}
              color="#f72585"
            />
            <StatsCard
              icon="bookmark"
              title="Saved Parts"
              value={stats?.saved_parts || 0}
              color="#7209b7"
            />
            <StatsCard
              icon="calendar-clock"
              title="Member Since"
              value={stats?.member_since ? new Date(stats.member_since).getFullYear() : 'New'}
              color="#e94560"
            />
          </ScrollView>
        </View>

        {/* Recent Scans */}
        {recentScans && recentScans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ScanHistoryScreen')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScansContainer}
            >
              {recentScans.map((scan: any) => (
                <RecentScanCard
                  key={scan.id}
                  scan={scan}
                  onPress={() => navigation.navigate('ScanDetails', { scanId: scan.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* My Vehicles */}
        {vehicles && vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Vehicles</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VehiclesScreen')}>
                <Text style={styles.seeAllText}>Manage</Text>
              </TouchableOpacity>
            </View>
            {vehicles.slice(0, 3).map((vehicle: any) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onPress={() => navigation.navigate('VehicleDetails', { vehicleId: vehicle.id })}
                style={styles.vehicleCard}
              />
            ))}
          </View>
        )}

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipCard}>
              <Icon name="lightbulb-outline" size={24} color={colors.primary} />
              <Text style={styles.tipText}>
                Take clear photos in good lighting for better part identification
              </Text>
            </View>
            <View style={styles.tipCard}>
              <Icon name="shield-check-outline" size={24} color={colors.success} />
              <Text style={styles.tipText}>
                Always verify part compatibility before purchasing
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden'
  },
  headerGradient: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md
  },
  greeting: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white
  },
  subGreeting: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  notificationBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary
  },
  primaryVehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md
  },
  primaryVehicleText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.white,
    marginLeft: spacing.sm
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingTop: 220,
    paddingBottom: spacing.xl
  },
  section: {
    marginBottom: spacing.xl
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.primary
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between'
  },
  statsContainer: {
    paddingHorizontal: spacing.lg
  },
  recentScansContainer: {
    paddingHorizontal: spacing.lg
  },
  vehicleCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md
  },
  tipsContainer: {
    paddingHorizontal: spacing.lg
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    marginLeft: spacing.md
  },
  bottomSpacing: {
    height: 80
  }
});