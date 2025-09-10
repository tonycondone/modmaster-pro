import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import { uploadScan } from '../../store/slices/scanSlice';
import { showToast } from '../../utils/toast';
import LottieView from 'lottie-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ScanPreviewScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.scan);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('off');
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [imageQuality, setImageQuality] = useState<'good' | 'poor' | 'checking'>('checking');
  
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const scanTips = [
    'Ensure good lighting for better results',
    'Keep the part centered in the frame',
    'Avoid shadows and reflections',
    'Get close enough to show details',
    'Keep your device steady',
    'Clean parts scan better than dirty ones'
  ];

  const toggleCameraType = () => {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
  };

  const toggleFlash = () => {
    setFlash(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      checkImageQuality(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsScanning(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: true,
        });
        setCapturedImage(photo.uri);
        checkImageQuality(photo.uri);
      } catch (error) {
        showToast('Failed to capture image', 'error');
      } finally {
        setIsScanning(false);
      }
    }
  };

  const checkImageQuality = async (uri: string) => {
    setImageQuality('checking');
    // Simulate image quality check
    setTimeout(() => {
      // In a real app, this would analyze the image for blur, lighting, etc.
      const quality = Math.random() > 0.3 ? 'good' : 'poor';
      setImageQuality(quality);
      
      if (quality === 'poor') {
        Alert.alert(
          'Image Quality',
          'The image quality might affect scan accuracy. Would you like to retake?',
          [
            { text: 'Use Anyway', onPress: () => processScan(uri) },
            { text: 'Retake', onPress: () => setCapturedImage(null), style: 'cancel' },
          ]
        );
      }
    }, 1500);
  };

  const processScan = async (imageUri: string) => {
    try {
      const result = await dispatch(uploadScan({ imageUri })).unwrap();
      navigation.navigate('ScanResults', { scanId: result.scanId });
    } catch (error: any) {
      showToast(error.message || 'Failed to process scan', 'error');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setImageQuality('checking');
  };

  const renderTipsModal = () => (
    <Modal
      visible={showTips}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTips(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Scanning Tips</Text>
          
          {scanTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowTips(false)}
          >
            <Text style={styles.modalButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={64} color="#999" />
        <Text style={styles.permissionText}>No access to camera</Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />
        
        <View style={styles.qualityIndicator}>
          {imageQuality === 'checking' ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.qualityText}>Checking image quality...</Text>
            </>
          ) : (
            <>
              <Icon
                name={imageQuality === 'good' ? 'check-circle' : 'alert-circle'}
                size={24}
                color="#FFF"
              />
              <Text style={styles.qualityText}>
                Image quality: {imageQuality === 'good' ? 'Good' : 'Poor'}
              </Text>
            </>
          )}
        </View>
        
        <View style={styles.capturedActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={retakePhoto}
          >
            <Icon name="camera-retake" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.scanButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => processScan(capturedImage)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="magnify-scan" size={24} color="#FFF" />
                <Text style={styles.actionButtonText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        flashMode={flash}
        ref={cameraRef}
        ratio="16:9"
      >
        {/* Scan guide overlay */}
        <View style={styles.scanOverlay}>
          <View style={styles.scanGuide}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.scanHint}>Position the part within the frame</Text>
        </View>
        
        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Icon
              name={flash === 'off' ? 'flash-off' : flash === 'on' ? 'flash' : 'flash-auto'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowTips(true)}>
            <Icon name="help-circle" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Icon name="image" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.captureButton, isScanning && styles.capturingButton]}
            onPress={takePicture}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
            <Icon name="camera-flip" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Camera>
      
      {/* Animation overlay when scanning */}
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <LottieView
            source={require('../../assets/animations/scanning-animation.json')}
            autoPlay
            loop
            style={styles.scanningAnimation}
          />
          <Text style={styles.scanningText}>Capturing image...</Text>
        </View>
      )}
      
      {renderTipsModal()}
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
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanGuide: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
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
  scanHint: {
    position: 'absolute',
    bottom: -40,
    color: '#FFF',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 25,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 30,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
    borderRadius: 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  capturingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningAnimation: {
    width: 200,
    height: 200,
  },
  scanningText: {
    color: '#FFF',
    fontSize: 18,
    marginTop: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  qualityIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 25,
  },
  qualityText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
  },
  capturedActions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retakeButton: {
    backgroundColor: '#666',
  },
  scanButton: {
    minWidth: 120,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScanPreviewScreen;