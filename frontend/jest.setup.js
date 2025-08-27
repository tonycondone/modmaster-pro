import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo modules
jest.mock('expo-camera');
jest.mock('expo-image-picker');
jest.mock('expo-file-system');
jest.mock('expo-media-library');
jest.mock('expo-location');
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants');
jest.mock('expo-linking');
jest.mock('expo-status-bar');

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Mock react-native-sound
jest.mock('react-native-sound', () => ({
  setCategory: jest.fn(),
}));

// Mock react-native-vibration
jest.mock('react-native-vibration', () => ({
  Vibration: {
    vibrate: jest.fn(),
  },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getDeviceId: jest.fn(() => 'test-device-id'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '15.0'),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-sensitive-info
jest.mock('react-native-sensitive-info', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  deleteItem: jest.fn(),
  getAllItems: jest.fn(),
}));

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  onRegister: jest.fn(),
  onNotification: jest.fn(),
  requestPermissions: jest.fn(),
  getScheduledLocalNotifications: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  cancelLocalNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

// Mock react-native-background-actions
jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(),
}));

// Mock react-native-background-downloader
jest.mock('react-native-background-downloader', () => ({
  download: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  stop: jest.fn(),
  checkForExistingDownloads: jest.fn(),
}));

// Mock react-native-background-upload
jest.mock('react-native-background-upload', () => ({
  startUpload: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}));

// Mock react-native-background-geolocation
jest.mock('react-native-background-geolocation', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  status: jest.fn(),
}));

// Mock react-native-background-timer
jest.mock('react-native-background-timer', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
}));

// Mock react-native-background-job
jest.mock('react-native-background-job', () => ({
  register: jest.fn(),
  schedule: jest.fn(),
  cancel: jest.fn(),
  cancelAll: jest.fn(),
}));

// Mock react-native-background-actions
jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(),
}));

// Mock react-native-background-downloader
jest.mock('react-native-background-downloader', () => ({
  download: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  stop: jest.fn(),
  checkForExistingDownloads: jest.fn(),
}));

// Mock react-native-background-upload
jest.mock('react-native-background-upload', () => ({
  startUpload: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}));

// Mock react-native-background-geolocation
jest.mock('react-native-background-geolocation', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  status: jest.fn(),
}));

// Mock react-native-background-timer
jest.mock('react-native-background-timer', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
}));

// Mock react-native-background-job
jest.mock('react-native-background-job', () => ({
  register: jest.fn(),
  schedule: jest.fn(),
  cancel: jest.fn(),
  cancelAll: jest.fn(),
}));

// Global test setup
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}; 