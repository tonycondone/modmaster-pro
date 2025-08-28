import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Avatar,
  List,
  Switch,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { fetchUserProfile } from '@/store/slices/userSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile, isLoading } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      await dispatch(fetchUserProfile());
    } catch (error) {
      console.error('Error loading profile:', error);
    }
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
            } catch (error: any) {
              Alert.alert('Error', error || 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    const firstName = user?.firstName || profile?.firstName || '';
    const lastName = user?.lastName || profile?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    const firstName = user?.firstName || profile?.firstName || '';
    const lastName = user?.lastName || profile?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'User';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={getInitials()}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Title style={styles.profileName}>{getFullName()}</Title>
              <Text style={styles.profileEmail}>{user?.email || profile?.email}</Text>
              <Text style={styles.profileMemberSince}>
                Member since {new Date(user?.createdAt || profile?.createdAt || '').toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('EditProfile' as never)}
            style={styles.editButton}
          >
            Edit Profile
          </Button>
        </Card.Content>
      </Card>

      {/* Account Settings */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Account Settings</Title>
          
          <List.Item
            title="Personal Information"
            description="Update your name, email, and contact details"
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('EditProfile' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Change Password"
            description="Update your account password"
            left={(props) => <List.Icon {...props} icon="lock" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ChangePassword' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Settings"
            description="Manage your privacy preferences"
            left={(props) => <List.Icon {...props} icon="shield" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacySettings' as never)}
          />
        </Card.Content>
      </Card>

      {/* Notifications */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Notifications</Title>
          
          <List.Item
            title="Email Notifications"
            description="Receive updates via email"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={profile?.preferences?.notifications?.email || false}
                onValueChange={() => {
                  // Handle email notification toggle
                }}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Push Notifications"
            description="Receive push notifications on your device"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={profile?.preferences?.notifications?.push || false}
                onValueChange={() => {
                  // Handle push notification toggle
                }}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="SMS Notifications"
            description="Receive updates via SMS"
            left={(props) => <List.Icon {...props} icon="message" />}
            right={() => (
              <Switch
                value={profile?.preferences?.notifications?.sms || false}
                onValueChange={() => {
                  // Handle SMS notification toggle
                }}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* App Features */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>App Features</Title>
          
          <List.Item
            title="Scan History"
            description="View your previous part scans"
            left={(props) => <List.Icon {...props} icon="history" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ScanHistory' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Saved Parts"
            description="View your saved parts and favorites"
            left={(props) => <List.Icon {...props} icon="heart" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('SavedParts' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Order History"
            description="View your purchase history"
            left={(props) => <List.Icon {...props} icon="package" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('OrderHistory' as never)}
          />
        </Card.Content>
      </Card>

      {/* Support & Legal */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Support & Legal</Title>
          
          <List.Item
            title="Help & Support"
            description="Get help and contact support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('HelpSupport' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Terms of Service"
            description="Read our terms of service"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('TermsOfService' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Policy"
            description="Read our privacy policy"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacyPolicy' as never)}
          />
          
          <Divider />
          
          <List.Item
            title="About"
            description="App version and information"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('About' as never)}
          />
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor={theme.colors.error}
            buttonColor="transparent"
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    backgroundColor: '#2563eb',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  profileMemberSince: {
    fontSize: 12,
    opacity: 0.5,
  },
  editButton: {
    marginTop: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logoutButton: {
    borderColor: '#dc2626',
  },
});

export default ProfileScreen;