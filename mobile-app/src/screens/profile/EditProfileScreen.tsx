import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  TextInput,
  Button,
  RadioButton,
  HelperText,
  Avatar,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateUserProfile, uploadAvatar } from '../../store/slices/userSlice';
import { showToast } from '../../utils/toast';
import { format } from 'date-fns';

const EditProfileScreen = () => {
  // 1. STATE MANAGEMENT - MANDATORY
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
    location: {
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });

  const [formErrors, setFormErrors] = useState<any>({});

  // 2. REDUX INTEGRATION - MANDATORY
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.profile);

  // 3. NAVIGATION - MANDATORY
  const navigation = useNavigation<any>();

  // 4. DATA FETCHING - MANDATORY
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        bio: user.bio || '',
        location: {
          city: user.location?.city || '',
          state: user.location?.state || '',
          country: user.location?.country || '',
          postalCode: user.location?.postalCode || '',
        },
      });
    }
  }, [user]);

  // Validation
  const validateForm = () => {
    const errors: any = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (formData.phoneNumber && !/^\+?[\d\s()-]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Invalid phone number format';
    }

    if (formData.location.postalCode && !/^\d{5}(-\d{4})?$/.test(formData.location.postalCode)) {
      errors.postalCode = 'Invalid ZIP code format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handlePickImage = async () => {
    const options = [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ];

    if (user?.avatar) {
      options.splice(2, 0, { text: 'Remove Photo', onPress: handleRemovePhoto, style: 'destructive' });
    }

    Alert.alert('Change Profile Photo', undefined, options);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const handleChooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Gallery permission is required to choose photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingAvatar(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      await dispatch(uploadAvatar(formData)).unwrap();
      showToast('Profile photo updated', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploadingAvatar(true);
      await dispatch(updateUserProfile({ avatar: null })).unwrap();
      showToast('Profile photo removed', 'success');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors', 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await dispatch(updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender as any || undefined,
        bio: formData.bio || undefined,
        location: {
          city: formData.location.city || undefined,
          state: formData.location.state || undefined,
          country: formData.location.country || undefined,
          postalCode: formData.location.postalCode || undefined,
        },
      })).unwrap();

      showToast('Profile updated successfully', 'success');
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        dateOfBirth: selectedDate.toISOString(),
      });
    }
  };

  // 5. ERROR HANDLING - MANDATORY
  if (error) {
    Alert.alert('Error', error);
    setError(null);
  }

  // 6. LOADING STATE - MANDATORY
  // Loading is handled inline with buttons

  // 7. MAIN RENDER - MANDATORY
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploadingAvatar}>
            <View style={styles.avatarContainer}>
              {uploadingAvatar ? (
                <ActivityIndicator size="large" color="#0066CC" />
              ) : (
                <>
                  <Avatar.Image
                    size={100}
                    source={
                      user?.avatar
                        ? { uri: user.avatar }
                        : require('../../../assets/images/placeholder.png')
                    }
                    style={styles.avatar}
                  />
                  <View style={styles.editAvatarBadge}>
                    <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <TextInput
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            mode="outlined"
            style={styles.input}
            error={!!formErrors.firstName}
          />
          <HelperText type="error" visible={!!formErrors.firstName}>
            {formErrors.firstName}
          </HelperText>

          <TextInput
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            mode="outlined"
            style={styles.input}
            error={!!formErrors.lastName}
          />
          <HelperText type="error" visible={!!formErrors.lastName}>
            {formErrors.lastName}
          </HelperText>

          <TextInput
            label="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            error={!!formErrors.phoneNumber}
          />
          <HelperText type="error" visible={!!formErrors.phoneNumber}>
            {formErrors.phoneNumber}
          </HelperText>

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <TextInput
              label="Date of Birth"
              value={formData.dateOfBirth ? format(new Date(formData.dateOfBirth), 'MMM d, yyyy') : ''}
              mode="outlined"
              style={styles.input}
              editable={false}
              left={<TextInput.Icon icon="calendar" />}
              right={<TextInput.Icon icon="chevron-down" />}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.genderSection}>
            <Text style={styles.genderLabel}>Gender</Text>
            <RadioButton.Group
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              value={formData.gender}
            >
              <View style={styles.genderOptions}>
                <RadioButton.Item label="Male" value="male" />
                <RadioButton.Item label="Female" value="female" />
                <RadioButton.Item label="Other" value="other" />
                <RadioButton.Item label="Prefer not to say" value="prefer_not_to_say" />
              </View>
            </RadioButton.Group>
          </View>

          <TextInput
            label="Bio"
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <HelperText type="info" visible={true}>
            {formData.bio.length}/200 characters
          </HelperText>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <TextInput
            label="City"
            value={formData.location.city}
            onChangeText={(text) => setFormData({
              ...formData,
              location: { ...formData.location, city: text }
            })}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="city" />}
          />

          <TextInput
            label="State"
            value={formData.location.state}
            onChangeText={(text) => setFormData({
              ...formData,
              location: { ...formData.location, state: text }
            })}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="map-marker-radius" />}
          />

          <TextInput
            label="Country"
            value={formData.location.country}
            onChangeText={(text) => setFormData({
              ...formData,
              location: { ...formData.location, country: text }
            })}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="earth" />}
          />

          <TextInput
            label="ZIP Code"
            value={formData.location.postalCode}
            onChangeText={(text) => setFormData({
              ...formData,
              location: { ...formData.location, postalCode: text }
            })}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            error={!!formErrors.postalCode}
          />
          <HelperText type="error" visible={!!formErrors.postalCode}>
            {formErrors.postalCode}
          </HelperText>
        </View>

        {/* Account Information (Read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <TextInput
            label="Email"
            value={user?.email || ''}
            mode="outlined"
            style={styles.input}
            editable={false}
            left={<TextInput.Icon icon="email" />}
          />
          <HelperText type="info" visible={true}>
            Email cannot be changed
          </HelperText>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            buttonColor="#0066CC"
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#E0E0E0',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 6,
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#0066CC',
    marginTop: 12,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  datePickerButton: {
    marginBottom: 8,
  },
  genderSection: {
    marginVertical: 16,
  },
  genderLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  genderOptions: {
    // RadioButton.Group handles layout
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#666',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
});