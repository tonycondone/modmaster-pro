import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  IconButton,
  Portal,
  Modal,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { createScan } from '../store/slices/scanSlice';
import { RootState } from '../store';

const { width, height } = Dimensions.get('window');
const CAMERA_RATIO = 4 / 3;

interface ScanScreenProps {
  route: {
    params?: {
      vehicleId: string;
      scanType?: string;
    };
  };
}

export const ScanScreen: React.FC<ScanScreenProps> = ({ route }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cameraRef = useRef<Camera>(null);
  
  const { vehicleId, scanType: initialScanType = 'engine_bay' } = route.params || {};
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  const { isCreating } = useSelector((state: RootState) => state.scans);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanType, setScanType] = useState(initialScanType);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        exif: true
      });
      
      setCapturedImage(photo.uri);
      setShowPreview(true);
    } catch (error) {
      console.error('Error taking picture:', error);
      showSnackbar('Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      exif: true
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      setShowPreview(true);
    }
  };

  const processScan = async () => {
    if (!capturedImage || !vehicleId) return;

    try {
      await dispatch(createScan({
        vehicleId,
        scanType,
        imageUri: capturedImage
      })).unwrap();

      navigation.navigate('ScanProgress', {
        vehicleId,
        scanType
      });
    } catch (error) {
      showSnackbar('Failed to process scan. Please try again.');
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const getScanGuideText = () => {
    switch (scanType) {
      case 'engine_bay':
        return 'Position the camera to capture the entire engine bay. Ensure good lighting and clear view of components.';
      case 'exterior':
        return 'Capture the full side profile of your vehicle. Stand 6-8 feet away for best results.';
      case 'interior':
        return 'Focus on the dashboard and center console area. Ensure all gauges and controls are visible.';
      case 'vin':
        return 'Locate the VIN plate (usually on dashboard or door jamb) and capture it clearly.';
      default:
        return 'Position the camera to capture the target area clearly.';
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Surface style={styles.permissionCard} elevation={2}>
          <MaterialCommunityIcons 
            name="camera-off" 
            size={64} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text variant="headlineSmall" style={styles.permissionTitle}>
            Camera Permission Required
          </Text>
          <Text variant="bodyMedium" style={styles.permissionText}>
            ModMaster Pro needs camera access to scan your vehicle and identify parts.
          </Text>
          <Button mode="contained" onPress={() => Camera.requestCameraPermissionsAsync()}>
            Grant Permission
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.back}
        ratio={CAMERA_RATIO}
      >
        {/* Header */}
        <Surface style={styles.header} elevation={2}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
          <View style={styles.headerContent}>
            <Text variant="titleMedium" style={styles.headerTitle}>
              Scan {selectedVehicle?.nickname || 'Vehicle'}
            </Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>
              {scanType.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </Surface>

        {/* Scan Type Selector */}
        <View style={styles.scanTypeContainer}>
          <SegmentedButtons
            value={scanType}
            onValueChange={setScanType}
            buttons={[
              { value: 'engine_bay', label: 'Engine' },
              { value: 'exterior', label: 'Exterior' },
              { value: 'interior', label: 'Interior' },
              { value: 'vin', label: 'VIN' }
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Guide Overlay */}
        {showGuide && (
          <TouchableOpacity
            style={styles.guideOverlay}
            onPress={() => setShowGuide(false)}
            activeOpacity={0.9}
          >
            <Surface style={styles.guideCard} elevation={3}>
              <MaterialCommunityIcons 
                name="camera-iris" 
                size={48} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={styles.guideTitle}>
                Scanning Tips
              </Text>
              <Text variant="bodyMedium" style={styles.guideText}>
                {getScanGuideText()}
              </Text>
              <Button mode="text" onPress={() => setShowGuide(false)}>
                Got it
              </Button>
            </Surface>
          </TouchableOpacity>
        )}

        {/* Viewfinder Frame */}
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <IconButton
            icon="image"
            size={32}
            onPress={pickImage}
            style={styles.galleryButton}
            iconColor={theme.colors.onSurface}
          />
          
          <TouchableOpacity
            onPress={takePicture}
            disabled={isCapturing}
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonActive
            ]}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <IconButton
            icon="help-circle"
            size={32}
            onPress={() => setShowGuide(true)}
            style={styles.helpButton}
            iconColor={theme.colors.onSurface}
          />
        </View>
      </Camera>

      {/* Image Preview Modal */}
      <Portal>
        <Modal
          visible={showPreview}
          onDismiss={() => setShowPreview(false)}
          contentContainerStyle={styles.previewModal}
        >
          <Surface style={styles.previewContainer} elevation={3}>
            <Text variant="titleLarge" style={styles.previewTitle}>
              Review Your Scan
            </Text>
            
            {capturedImage && (
              <Image
                source={{ uri: capturedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            
            <Text variant="bodyMedium" style={styles.previewText}>
              Make sure the image is clear and all parts are visible.
            </Text>
            
            <View style={styles.previewActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowPreview(false);
                  setCapturedImage(null);
                }}
                style={styles.previewButton}
              >
                Retake
              </Button>
              
              <Button
                mode="contained"
                onPress={processScan}
                loading={isCreating}
                disabled={isCreating}
                style={styles.previewButton}
              >
                Process Scan
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backButton: {
    margin: 0,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scanTypeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
  },
  segmentedButtons: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCard: {
    padding: 24,
    marginHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 320,
  },
  guideTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  guideText: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  viewfinder: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.1,
    right: width * 0.1,
    height: height * 0.4,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 4,
  },
  captureButtonActive: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: '#fff',
  },
  galleryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  helpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  permissionCard: {
    padding: 32,
    margin: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  permissionTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  previewModal: {
    margin: 16,
  },
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewTitle: {
    padding: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  previewText: {
    padding: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  previewButton: {
    flex: 1,
  },
});