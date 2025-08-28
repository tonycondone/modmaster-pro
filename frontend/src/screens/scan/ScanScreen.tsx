import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '../../theme';
import ScanModeSelector from '../../components/ScanModeSelector';
import ScanGuide from '../../components/ScanGuide';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cameraRef = useRef<Camera>(null);
  
  const { primaryVehicle } = useSelector((state: any) => state.vehicles);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedMode, setSelectedMode] = useState('parts');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      await MediaLibrary.requestPermissionsAsync();
      
      // Pulse animation for capture button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true
      });
      
      navigation.navigate('ScanPreview', {
        imageUri: photo.uri,
        scanType: selectedMode,
        vehicleId: primaryVehicle?.id
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.cancelled) {
        navigation.navigate('ScanPreview', {
          imageUri: result.uri,
          scanType: selectedMode,
          vehicleId: primaryVehicle?.id
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={60} color={colors.textSecondary} />
        <Text style={styles.permissionText}>Camera access is required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={type}
        flashMode={flash}
        ratio="16:9"
      >
        <View style={styles.cameraOverlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="close" size={28} color={colors.white} />
            </TouchableOpacity>

            <ScanModeSelector
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
            />

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setFlash(
                flash === Camera.Constants.FlashMode.off
                  ? Camera.Constants.FlashMode.on
                  : Camera.Constants.FlashMode.off
              )}
            >
              <Icon
                name={flash === Camera.Constants.FlashMode.on ? 'flash' : 'flash-off'}
                size={28}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Scan Guide */}
          <ScanGuide scanType={selectedMode} />

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pickImage}
            >
              <Icon name="image" size={28} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePicture}
              disabled={isCapturing}
            >
              <Animated.View
                style={[
                  styles.captureButton,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                {isCapturing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setType(
                type === Camera.Constants.Type.back
                  ? Camera.Constants.Type.front
                  : Camera.Constants.Type.back
              )}
            >
              <Icon name="camera-flip" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Vehicle Info */}
          {primaryVehicle && (
            <TouchableOpacity
              style={styles.vehicleInfo}
              onPress={() => navigation.navigate('SelectVehicle')}
            >
              <Icon name="car" size={16} color={colors.white} />
              <Text style={styles.vehicleInfoText}>
                {primaryVehicle.year} {primaryVehicle.make} {primaryVehicle.model}
              </Text>
              <Icon name="chevron-right" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  camera: {
    flex: 1,
    width: '100%'
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: spacing.xl
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white
  },
  vehicleInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  vehicleInfoText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginHorizontal: spacing.sm
  },
  permissionText: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold
  }
});