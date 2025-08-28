import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Title,
  List,
  Switch,
  Button,
  Divider,
  Surface,
  Text,
  Dialog,
  Portal,
  RadioButton,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { updateUserSettings } from '@/store/slices/userSlice';
import { logout } from '@/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { user, settings } = useSelector((state: RootState) => state.user);
  
  // Local state for settings
  const [localSettings, setLocalSettings] = useState({
    notifications: {
      pushNotifications: settings?.notifications?.pushNotifications ?? true,
      emailNotifications: settings?.notifications?.emailNotifications ?? true,
      scanResults: settings?.notifications?.scanResults ?? true,
      orderUpdates: settings?.notifications?.orderUpdates ?? true,
      promotions: settings?.notifications?.promotions ?? false,
    },
    privacy: {
      shareUsageData: settings?.privacy?.shareUsageData ?? false,
      allowLocationAccess: settings?.privacy?.allowLocationAccess ?? true,
    },
    app: {
      darkMode: settings?.app?.darkMode ?? false,
      language: settings?.app?.language ?? 'en',
      autoScanUpload: settings?.app?.autoScanUpload ?? true,
      cacheImages: settings?.app?.cacheImages ?? true,
    },
  });

  // Dialog states
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  
  // Snackbar
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const updateSetting = (section: string, key: string, value: any) => {
    const newSettings = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [key]: value,
      },
    };
    setLocalSettings(newSettings);
    
    // Save to backend
    dispatch(updateUserSettings(newSettings) as any);
    showSnackbar('Settings updated');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      dispatch(logout());
      navigation.navigate('Login' as never);
    } catch (error) {
      showSnackbar('Error logging out');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Implementation for account deletion
            showSnackbar('Account deletion requested');
          },
        },
      ]
    );
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const themes = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  const languages = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
    { label: 'German', value: 'de' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title>Account</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Edit Profile"
            description="Update your personal information"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('EditProfile' as never)}
          />
          
          <List.Item
            title="Change Password"
            description="Update your account password"
            left={(props) => <List.Icon {...props} icon="key-change" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ChangePassword' as never)}
          />
          
          <List.Item
            title="Two-Factor Authentication"
            description="Add an extra layer of security"
            left={(props) => <List.Icon {...props} icon="shield-check" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('TwoFactorAuth' as never)}
          />
        </Card.Content>
      </Card>

      {/* Notifications Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title>Notifications</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Push Notifications"
            description="Receive notifications on your device"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={localSettings.notifications.pushNotifications}
                onValueChange={(value) => updateSetting('notifications', 'pushNotifications', value)}
              />
            )}
          />
          
          <List.Item
            title="Email Notifications"
            description="Receive notifications via email"
            left={(props) => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={localSettings.notifications.emailNotifications}
                onValueChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
              />
            )}
          />
          
          <List.Item
            title="Scan Results"
            description="Get notified when scan processing is complete"
            left={(props) => <List.Icon {...props} icon="camera" />}
            right={() => (
              <Switch
                value={localSettings.notifications.scanResults}
                onValueChange={(value) => updateSetting('notifications', 'scanResults', value)}
              />
            )}
          />
          
          <List.Item
            title="Order Updates"
            description="Track your order status and delivery"
            left={(props) => <List.Icon {...props} icon="package-variant" />}
            right={() => (
              <Switch
                value={localSettings.notifications.orderUpdates}
                onValueChange={(value) => updateSetting('notifications', 'orderUpdates', value)}
              />
            )}
          />
          
          <List.Item
            title="Promotions & Offers"
            description="Receive special deals and discounts"
            left={(props) => <List.Icon {...props} icon="tag" />}
            right={() => (
              <Switch
                value={localSettings.notifications.promotions}
                onValueChange={(value) => updateSetting('notifications', 'promotions', value)}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* App Preferences */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title>App Preferences</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Theme"
            description={localSettings.app.darkMode ? 'Dark' : 'Light'}
            left={(props) => <List.Icon {...props} icon="palette" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setThemeDialogVisible(true)}
          />
          
          <List.Item
            title="Language"
            description="English"
            left={(props) => <List.Icon {...props} icon="translate" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setLanguageDialogVisible(true)}
          />
          
          <List.Item
            title="Auto-upload Scans"
            description="Automatically upload scans for processing"
            left={(props) => <List.Icon {...props} icon="cloud-upload" />}
            right={() => (
              <Switch
                value={localSettings.app.autoScanUpload}
                onValueChange={(value) => updateSetting('app', 'autoScanUpload', value)}
              />
            )}
          />
          
          <List.Item
            title="Cache Images"
            description="Store images locally for faster loading"
            left={(props) => <List.Icon {...props} icon="cached" />}
            right={() => (
              <Switch
                value={localSettings.app.cacheImages}
                onValueChange={(value) => updateSetting('app', 'cacheImages', value)}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Privacy & Security */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title>Privacy & Security</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Share Usage Data"
            description="Help improve the app by sharing anonymous usage data"
            left={(props) => <List.Icon {...props} icon="chart-line" />}
            right={() => (
              <Switch
                value={localSettings.privacy.shareUsageData}
                onValueChange={(value) => updateSetting('privacy', 'shareUsageData', value)}
              />
            )}
          />
          
          <List.Item
            title="Location Access"
            description="Allow location access for better part recommendations"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            right={() => (
              <Switch
                value={localSettings.privacy.allowLocationAccess}
                onValueChange={(value) => updateSetting('privacy', 'allowLocationAccess', value)}
              />
            )}
          />
          
          <List.Item
            title="Privacy Policy"
            description="Read our privacy policy"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacyPolicy' as never)}
          />
          
          <List.Item
            title="Terms of Service"
            description="Read our terms of service"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('TermsOfService' as never)}
          />
        </Card.Content>
      </Card>

      {/* Support & Help */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title>Support & Help</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Help Center"
            description="Get answers to common questions"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('HelpCenter' as never)}
          />
          
          <List.Item
            title="Contact Support"
            description="Get help from our support team"
            left={(props) => <List.Icon {...props} icon="message-text" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ContactSupport' as never)}
          />
          
          <List.Item
            title="Report a Bug"
            description="Let us know about any issues"
            left={(props) => <List.Icon {...props} icon="bug" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ReportBug' as never)}
          />
        </Card.Content>
      </Card>

      {/* Danger Zone */}
      <Card style={styles.dangerCard}>
        <Card.Content>
          <Title style={styles.dangerTitle}>Account Actions</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="outlined"
            onPress={() => setLogoutDialogVisible(true)}
            style={styles.dangerButton}
            textColor="#e74c3c"
          >
            Log Out
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => setDeleteAccountDialogVisible(true)}
            style={[styles.dangerButton, styles.deleteButton]}
            textColor="#e74c3c"
          >
            Delete Account
          </Button>
        </Card.Content>
      </Card>

      {/* Theme Dialog */}
      <Portal>
        <Dialog visible={themeDialogVisible} onDismiss={() => setThemeDialogVisible(false)}>
          <Dialog.Title>Choose Theme</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                updateSetting('app', 'darkMode', value === 'dark');
                setThemeDialogVisible(false);
              }}
              value={localSettings.app.darkMode ? 'dark' : 'light'}
            >
              {themes.map((theme) => (
                <RadioButton.Item
                  key={theme.value}
                  label={theme.label}
                  value={theme.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Log Out</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to log out?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => {
              setLogoutDialogVisible(false);
              handleLogout();
            }}>
              Log Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Account Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteAccountDialogVisible} onDismiss={() => setDeleteAccountDialogVisible(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteAccountDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={() => {
                setDeleteAccountDialogVisible(false);
                handleDeleteAccount();
              }}
              textColor="#e74c3c"
            >
              Delete Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionCard: {
    margin: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  dangerCard: {
    margin: 16,
    marginBottom: 8,
    borderColor: '#ffe6e6',
    backgroundColor: '#fff5f5',
  },
  dangerTitle: {
    color: '#e74c3c',
  },
  dangerButton: {
    marginVertical: 8,
    borderColor: '#e74c3c',
  },
  deleteButton: {
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default SettingsScreen;