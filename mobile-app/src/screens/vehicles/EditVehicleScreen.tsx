import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  useTheme,
  TextInput,
  Button,
  HelperText,
  IconButton,
  SegmentedButtons,
  Chip,
  Divider,
  ProgressBar,
  Card,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppDispatch, RootState } from '../../store';
import { updateVehicle, fetchVehicleById } from '../../store/slices/vehicleSlice';
import { showToast } from '../../utils/toast';
import { useRoute, RouteProp } from '@react-navigation/native';

type RouteParams = {
  EditVehicle: {
    vehicleId: string;
  };
};

const vehicleSchema = Yup.object().shape({
  make: Yup.string()
    .min(2, 'Make must be at least 2 characters')
    .required('Vehicle make is required'),
  model: Yup.string()
    .min(2, 'Model must be at least 2 characters')
    .required('Vehicle model is required'),
  year: Yup.number()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, 'Invalid year')
    .required('Vehicle year is required'),
  vin: Yup.string()
    .matches(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format')
    .optional(),
  licensePlate: Yup.string()
    .max(15, 'License plate too long')
    .optional(),
  mileage: Yup.number()
    .min(0, 'Mileage cannot be negative')
    .max(999999, 'Mileage too high')
    .required('Current mileage is required'),
});

const EditVehicleScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const route = useRoute<RouteProp<RouteParams, 'EditVehicle'>>();
  const { vehicleId } = route.params;
  const { isLoading, currentVehicle } = useSelector((state: RootState) => state.vehicles);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const steps = [
    { label: 'Basic Info', value: '0' },
    { label: 'Details', value: '1' },
    { label: 'Photos', value: '2' },
    { label: 'Maintenance', value: '3' },
    { label: 'Review', value: '4' },
  ];

  // Load vehicle data on mount
  React.useEffect(() => {
    const loadVehicle = async () => {
      try {
        setIsLoadingVehicle(true);
        await dispatch(fetchVehicleById(vehicleId)).unwrap();
      } catch (error) {
        showToast('Failed to load vehicle data', 'error');
        navigation.goBack();
      } finally {
        setIsLoadingVehicle(false);
      }
    };
    
    loadVehicle();
  }, [vehicleId, dispatch]);

  // Set photos when vehicle data is loaded
  React.useEffect(() => {
    if (currentVehicle?.photos) {
      setPhotos(currentVehicle.photos);
    }
  }, [currentVehicle]);

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      showToast('Permission to access photos is required', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      showToast('Permission to access camera is required', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  if (isLoadingVehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading vehicle data...</Text>
      </View>
    );
  }

  const handleSubmit = async (values: any) => {
    try {
      const vehicleData = {
        ...values,
        photos,
      };

      await dispatch(updateVehicle({ id: vehicleId, data: vehicleData })).unwrap();
      showToast('Vehicle updated successfully!', 'success');
      navigation.goBack();
    } catch (error: any) {
      showToast(error.message || 'Failed to add vehicle', 'error');
    }
  };

  const renderStepContent = (values: any, formikProps: any) => {
    const { handleChange, handleBlur, errors, touched, setFieldValue } = formikProps;

    switch (currentStep) {
      case 0: // Basic Info
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepDescription}>
              Enter the basic details of your vehicle
            </Text>

            <TextInput
              label="Make"
              value={values.make}
              onChangeText={handleChange('make')}
              onBlur={handleBlur('make')}
              mode="outlined"
              placeholder="e.g., Toyota"
              left={<TextInput.Icon icon="car" />}
              error={touched.make && !!errors.make}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.make && !!errors.make}>
              {errors.make}
            </HelperText>

            <TextInput
              label="Model"
              value={values.model}
              onChangeText={handleChange('model')}
              onBlur={handleBlur('model')}
              mode="outlined"
              placeholder="e.g., Camry"
              error={touched.model && !!errors.model}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.model && !!errors.model}>
              {errors.model}
            </HelperText>

            <TextInput
              label="Year"
              value={values.year}
              onChangeText={handleChange('year')}
              onBlur={handleBlur('year')}
              mode="outlined"
              keyboardType="numeric"
              placeholder="e.g., 2020"
              left={<TextInput.Icon icon="calendar" />}
              error={touched.year && !!errors.year}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.year && !!errors.year}>
              {errors.year}
            </HelperText>
          </View>
        );

      case 1: // Details
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vehicle Details</Text>
            <Text style={styles.stepDescription}>
              Add more specific information about your vehicle
            </Text>

            <TextInput
              label="VIN (Optional)"
              value={values.vin}
              onChangeText={(text) => setFieldValue('vin', text.toUpperCase())}
              onBlur={handleBlur('vin')}
              mode="outlined"
              placeholder="17 characters"
              autoCapitalize="characters"
              left={<TextInput.Icon icon="barcode" />}
              error={touched.vin && !!errors.vin}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.vin && !!errors.vin}>
              {errors.vin}
            </HelperText>

            <TextInput
              label="License Plate (Optional)"
              value={values.licensePlate}
              onChangeText={(text) => setFieldValue('licensePlate', text.toUpperCase())}
              onBlur={handleBlur('licensePlate')}
              mode="outlined"
              autoCapitalize="characters"
              left={<TextInput.Icon icon="card-text" />}
              error={touched.licensePlate && !!errors.licensePlate}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.licensePlate && !!errors.licensePlate}>
              {errors.licensePlate}
            </HelperText>

            <TextInput
              label="Color (Optional)"
              value={values.color}
              onChangeText={handleChange('color')}
              onBlur={handleBlur('color')}
              mode="outlined"
              left={<TextInput.Icon icon="palette" />}
              style={styles.input}
            />

            <TextInput
              label="Current Mileage"
              value={values.mileage}
              onChangeText={handleChange('mileage')}
              onBlur={handleBlur('mileage')}
              mode="outlined"
              keyboardType="numeric"
              right={<TextInput.Affix text="miles" />}
              left={<TextInput.Icon icon="counter" />}
              error={touched.mileage && !!errors.mileage}
              style={styles.input}
            />
            <HelperText type="error" visible={touched.mileage && !!errors.mileage}>
              {errors.mileage}
            </HelperText>

            <View style={styles.segmentedContainer}>
              <Text style={styles.label}>Transmission</Text>
              <SegmentedButtons
                value={values.transmission || 'automatic'}
                onValueChange={(value) => setFieldValue('transmission', value)}
                buttons={[
                  { value: 'automatic', label: 'Automatic' },
                  { value: 'manual', label: 'Manual' },
                ]}
                style={styles.segmented}
              />
            </View>

            <View style={styles.segmentedContainer}>
              <Text style={styles.label}>Fuel Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipContainer}>
                  {['gasoline', 'diesel', 'electric', 'hybrid'].map((fuel) => (
                    <Chip
                      key={fuel}
                      selected={values.fuelType === fuel}
                      onPress={() => setFieldValue('fuelType', fuel)}
                      style={styles.chip}
                    >
                      {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        );

      case 2: // Photos
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vehicle Photos</Text>
            <Text style={styles.stepDescription}>
              Add photos of your vehicle (optional)
            </Text>

            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    style={styles.removePhoto}
                    onPress={() => handleRemovePhoto(index)}
                  />
                </View>
              ))}
              
              {photos.length < 6 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handleAddPhoto}
                >
                  <IconButton icon="plus" size={32} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {photos.length < 6 && (
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.takePhotoButton}
              >
                Take Photo
              </Button>
            )}
          </View>
        );

      case 3: // Maintenance
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Maintenance Setup</Text>
            <Text style={styles.stepDescription}>
              Set up initial maintenance information (optional)
            </Text>

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <TextInput
                label="Purchase Date"
                value={values.purchaseDate ? new Date(values.purchaseDate).toLocaleDateString() : ''}
                mode="outlined"
                editable={false}
                left={<TextInput.Icon icon="calendar" />}
                style={styles.input}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={values.purchaseDate ? new Date(values.purchaseDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFieldValue('purchaseDate', date.toISOString());
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <TextInput
              label="Purchase Price (Optional)"
              value={values.purchasePrice}
              onChangeText={handleChange('purchasePrice')}
              onBlur={handleBlur('purchasePrice')}
              mode="outlined"
              keyboardType="numeric"
              left={<TextInput.Icon icon="currency-usd" />}
              style={styles.input}
            />

            <TextInput
              label="Insurance Provider (Optional)"
              value={values.insuranceProvider}
              onChangeText={handleChange('insuranceProvider')}
              onBlur={handleBlur('insuranceProvider')}
              mode="outlined"
              left={<TextInput.Icon icon="shield-car" />}
              style={styles.input}
            />

            <TextInput
              label="Notes (Optional)"
              value={values.notes}
              onChangeText={handleChange('notes')}
              onBlur={handleBlur('notes')}
              mode="outlined"
              multiline
              numberOfLines={3}
              left={<TextInput.Icon icon="note-text" />}
              style={styles.input}
            />
          </View>
        );

      case 4: // Review
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review Your Vehicle</Text>
            <Text style={styles.stepDescription}>
              Please review the information before saving
            </Text>

            <Card style={styles.reviewCard}>
              <Card.Content>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Vehicle:</Text>
                  <Text style={styles.reviewValue}>
                    {values.year} {values.make} {values.model}
                  </Text>
                </View>
                
                {values.vin && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>VIN:</Text>
                    <Text style={styles.reviewValue}>{values.vin}</Text>
                  </View>
                )}
                
                {values.licensePlate && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>License Plate:</Text>
                    <Text style={styles.reviewValue}>{values.licensePlate}</Text>
                  </View>
                )}
                
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Mileage:</Text>
                  <Text style={styles.reviewValue}>{values.mileage} miles</Text>
                </View>
                
                {values.transmission && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Transmission:</Text>
                    <Text style={styles.reviewValue}>
                      {values.transmission.charAt(0).toUpperCase() + values.transmission.slice(1)}
                    </Text>
                  </View>
                )}
                
                {values.fuelType && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Fuel Type:</Text>
                    <Text style={styles.reviewValue}>
                      {values.fuelType.charAt(0).toUpperCase() + values.fuelType.slice(1)}
                    </Text>
                  </View>
                )}
                
                {photos.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Photos:</Text>
                    <Text style={styles.reviewValue}>{photos.length} photo(s)</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
          Add Vehicle
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ProgressBar
        progress={(currentStep + 1) / steps.length}
        color={theme.colors.primary}
        style={styles.progressBar}
      />

      <SegmentedButtons
        value={currentStep.toString()}
        onValueChange={(value) => setCurrentStep(parseInt(value))}
        buttons={steps}
        style={styles.stepper}
      />

      <Formik
        initialValues={{
          make: currentVehicle?.make || '',
          model: currentVehicle?.model || '',
          year: currentVehicle?.year?.toString() || '',
          vin: currentVehicle?.vin || '',
          licensePlate: currentVehicle?.licensePlate || '',
          color: currentVehicle?.color || '',
          mileage: currentVehicle?.mileage?.toString() || '',
          transmission: currentVehicle?.transmission || 'automatic',
          fuelType: currentVehicle?.fuelType || 'gasoline',
          purchaseDate: currentVehicle?.purchaseDate || '',
          purchasePrice: currentVehicle?.purchasePrice?.toString() || '',
          insuranceProvider: currentVehicle?.insurance?.provider || '',
          notes: currentVehicle?.notes || '',
        }}
        enableReinitialize={true}
        validationSchema={vehicleSchema}
        onSubmit={handleSubmit}
      >
        {(formikProps) => (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderStepContent(formikProps.values, formikProps)}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                mode="text"
                onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  mode="contained"
                  onPress={() => {
                    // Basic validation for current step
                    formikProps.validateForm().then((errors) => {
                      if (Object.keys(errors).length === 0 || currentStep > 1) {
                        setCurrentStep(currentStep + 1);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      } else {
                        showToast('Please fill in required fields', 'error');
                      }
                    });
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={formikProps.handleSubmit as any}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Add Vehicle
                </Button>
              )}
            </View>
          </>
        )}
      </Formik>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
  },
  stepper: {
    margin: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  segmentedContainer: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  segmented: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhoto: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
  },
  takePhotoButton: {
    marginTop: 16,
  },
  datePickerButton: {
    marginBottom: 8,
  },
  reviewCard: {
    marginVertical: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewLabel: {
    fontSize: 16,
    color: '#666',
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default EditVehicleScreen;