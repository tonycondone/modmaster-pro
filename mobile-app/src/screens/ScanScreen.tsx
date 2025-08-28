import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import {
  Text,
  Button,
  Card,
  Title,
  useTheme,
  Portal,
  Modal,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { uploadScan } from '@/store/slices/scanSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const ScanScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  const { isLoading } = useSelector((state: RootState) => state.scans);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
        setShowPreview(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setShowPreview(false);
  };

  const processScan = async () => {
    if (!capturedImage) return;

    try {
      await dispatch(uploadScan({
        image: capturedImage,
        vehicleId: selectedVehicle,
      })).unwrap();
      
      setShowPreview(false);
      setCapturedImage(null);
      setSelectedVehicle(null);
      
      // Navigate to results or show success
      Alert.alert('Success', 'Scan uploaded successfully!');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to process scan');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Card style={styles.permissionCard}>
          <Card.Content style={styles.permissionContent}>
            <Icon name="camera-off" size={64} color={theme.colors.error} />
            <Title style={styles.permissionTitle}>Camera Access Required</Title>
            <Text style={styles.permissionText}>
              To scan parts, we need access to your camera. Please enable camera permissions in your device settings.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.permissionButton}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        type={cameraType}
        style={styles.camera}
        ratio="16:9"
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Parts</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setCameraType(
                cameraType === CameraType.back ? CameraType.front : CameraType.back
              )}
            >
              <Icon name="camera-switch" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Position the part within the frame
            </Text>
            <Text style={styles.instructionSubtext}>
              Ensure good lighting and clear visibility
            </Text>
          </View>

          {/* Camera Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={showPreview}
          onDismiss={() => setShowPreview(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.previewCard}>
            <Card.Content style={styles.previewContent}>
              <Title style={styles.previewTitle}>Review Scan</Title>
              
              {capturedImage && (
                <View style={styles.imagePreview}>
                  <Camera
                    type={cameraType}
                    style={styles.previewImage}
                    ratio="16:9"
                  />
                </View>
              )}

              <View style={styles.previewActions}>
                <Button
                  mode="outlined"
                  onPress={retakePicture}
                  style={styles.previewButton}
                >
                  Retake
                </Button>
                <Button
                  mode="contained"
                  onPress={processScan}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.previewButton}
                >
                  Process Scan
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.8,
    height: width * 0.8,
    marginLeft: -(width * 0.4),
    marginTop: -(width * 0.4),
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2563eb',
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  permissionCard: {
    margin: 20,
    elevation: 4,
  },
  permissionContent: {
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    opacity: 0.7,
  },
  permissionButton: {
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
  },
  previewCard: {
    elevation: 0,
  },
  previewContent: {
    padding: 20,
  },
  previewTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    flex: 1,
  },
});

export default ScanScreen;