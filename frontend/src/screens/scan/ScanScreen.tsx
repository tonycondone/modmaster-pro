import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { 
  Surface, 
  Text, 
  IconButton, 
  useTheme,
  Button,
  SegmentedButtons,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SCAN_TYPES } from '../../config/constants';

export const ScanScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [scanType, setScanType] = useState(SCAN_TYPES.ENGINE_BAY);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync();
      processImage(photo.uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      processImage(result.assets[0].uri);
    }
  };

  const processImage = (uri: string) => {
    // Navigate to scan result with image
    navigation.navigate('ScanResult', {
      imageUri: uri,
      scanType: scanType,
    });
  };

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermission}>
          <Text variant="headlineSmall">Camera Permission Required</Text>
          <Text variant="bodyLarge" style={styles.permissionText}>
            ModMaster Pro needs camera access to scan vehicle parts and VIN
          </Text>
          <Button mode="contained" onPress={() => Camera.requestCameraPermissionsAsync()}>
            Grant Permission
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge">Scan</Text>
        <IconButton
          icon="help-circle"
          size={24}
          onPress={() => setModalVisible(true)}
        />
      </Surface>

      {/* Scan Type Selector */}
      <View style={styles.scanTypeContainer}>
        <SegmentedButtons
          value={scanType}
          onValueChange={setScanType}
          buttons={[
            { value: SCAN_TYPES.ENGINE_BAY, label: 'Engine' },
            { value: SCAN_TYPES.VIN, label: 'VIN' },
            { value: SCAN_TYPES.PART_IDENTIFICATION, label: 'Part ID' },
          ]}
        />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera 
          style={styles.camera} 
          type={type}
          ref={ref => setCamera(ref)}
        >
          <View style={styles.cameraOverlay}>
            {/* Scan Frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            {/* Instructions */}
            <Text variant="bodyLarge" style={styles.instructions}>
              {getScanInstructions(scanType)}
            </Text>
          </View>
        </Camera>
      </View>

      {/* Controls */}
      <Surface style={styles.controls} elevation={4}>
        <IconButton
          icon="image"
          size={32}
          onPress={pickImage}
        />
        <IconButton
          icon="camera"
          size={48}
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
          onPress={takePicture}
        />
        <IconButton
          icon="camera-flip"
          size={32}
          onPress={() => {
            setType(type === CameraType.back ? CameraType.front : CameraType.back);
          }}
        />
      </Surface>

      {/* Help Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)}>
          <Surface style={styles.modal}>
            <Text variant="titleLarge" style={styles.modalTitle}>Scanning Tips</Text>
            <Text variant="bodyMedium" style={styles.modalText}>
              • Ensure good lighting for best results{'\n'}
              • Keep the camera steady{'\n'}
              • Frame the entire subject in view{'\n'}
              • For VIN scans, ensure the number is clearly visible{'\n'}
              • For parts, capture identifying marks or labels
            </Text>
            <Button mode="contained" onPress={() => setModalVisible(false)}>
              Got it
            </Button>
          </Surface>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const getScanInstructions = (scanType: string): string => {
  switch (scanType) {
    case SCAN_TYPES.ENGINE_BAY:
      return 'Position engine bay within frame';
    case SCAN_TYPES.VIN:
      return 'Align VIN number within frame';
    case SCAN_TYPES.PART_IDENTIFICATION:
      return 'Center the part in frame';
    default:
      return 'Position subject within frame';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    textAlign: 'center',
    marginVertical: 16,
  },
  scanTypeContainer: {
    padding: 16,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '80%',
    height: '60%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FF6B35',
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
  instructions: {
    position: 'absolute',
    bottom: -40,
    color: 'white',
    textAlign: 'center',
    width: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  modal: {
    margin: 32,
    padding: 24,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalText: {
    marginBottom: 24,
    lineHeight: 24,
  },
});