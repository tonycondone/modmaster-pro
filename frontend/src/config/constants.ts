import Constants from 'expo-constants';

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api/v1'
  : 'https://api.modmasterpro.com/api/v1';

export const AI_SERVICE_URL = __DEV__
  ? 'http://localhost:8001/api/v1'
  : 'https://ai.modmasterpro.com/api/v1';

// App Configuration
export const APP_NAME = 'ModMaster Pro';
export const APP_VERSION = Constants.manifest?.version || '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  SESSION_ID: 'sessionId',
  USER_DATA: 'userData',
  THEME_MODE: 'themeMode',
  ONBOARDING_COMPLETE: 'onboardingComplete',
};

// Scan Types
export const SCAN_TYPES = {
  ENGINE_BAY: 'engine_bay',
  VIN: 'vin',
  PART_IDENTIFICATION: 'part_identification',
  FULL_VEHICLE: 'full_vehicle',
} as const;

// Vehicle Makes (Top 20)
export const VEHICLE_MAKES = [
  'Acura', 'Audi', 'BMW', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Mazda',
  'Mercedes-Benz', 'Nissan', 'Ram', 'Subaru', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo',
];

// Part Categories
export const PART_CATEGORIES = [
  { id: 'engine', name: 'Engine', icon: 'engine' },
  { id: 'suspension', name: 'Suspension', icon: 'car-brake-abs' },
  { id: 'exhaust', name: 'Exhaust', icon: 'pipe' },
  { id: 'intake', name: 'Intake', icon: 'air-filter' },
  { id: 'wheels_tires', name: 'Wheels & Tires', icon: 'tire' },
  { id: 'brakes', name: 'Brakes', icon: 'car-brake-parking' },
  { id: 'exterior', name: 'Exterior', icon: 'car-side' },
  { id: 'interior', name: 'Interior', icon: 'car-seat' },
  { id: 'lighting', name: 'Lighting', icon: 'car-light-high' },
  { id: 'electronics', name: 'Electronics', icon: 'chip' },
];

// Project Status
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const;

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  SHOP: 'shop',
} as const;

// Image Picker Options
export const IMAGE_PICKER_OPTIONS = {
  mediaTypes: 'Images' as const,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
  base64: false,
  exif: false,
};

// Camera Options
export const CAMERA_OPTIONS = {
  quality: 0.8,
  base64: false,
  exif: false,
  skipProcessing: false,
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  VIN_REGEX: /^[A-HJ-NPR-Z0-9]{17}$/,
  PHONE_REGEX: /^\+?[\d\s\-().]+$/,
  PASSWORD_MIN_LENGTH: 8,
};