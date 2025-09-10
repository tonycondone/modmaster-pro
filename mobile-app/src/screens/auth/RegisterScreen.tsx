<<<<<<< HEAD
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { register, clearError } from '@/store/slices/authSlice';

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
      })).unwrap();
      // Navigation will be handled by the RootNavigator
    } catch (error: any) {
      Alert.alert('Registration Failed', error || 'An error occurred during registration');
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    dispatch(clearError());
  };

=======
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  Checkbox,
  IconButton,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';

import { AppDispatch, RootState } from '../../store';
import { register } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

const registerSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required('You must accept the terms and conditions'),
});

const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 0.25;
    if (/[a-z]/.test(password)) strength += 0.25;
    if (/[A-Z]/.test(password)) strength += 0.25;
    if (/\d/.test(password)) strength += 0.25;
    if (/[@$!%*?&]/.test(password)) strength += 0.25;
    return Math.min(strength, 1);
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 0.25) return 'Very Weak';
    if (strength < 0.5) return 'Weak';
    if (strength < 0.75) return 'Good';
    if (strength < 1) return 'Strong';
    return 'Very Strong';
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 0.25) return '#ff0000';
    if (strength < 0.5) return '#ff6600';
    if (strength < 0.75) return '#ffcc00';
    if (strength < 1) return '#99cc00';
    return '#00cc00';
  };

  const handleRegister = async (values: any) => {
    try {
      const result = await dispatch(register({
        ...values,
        marketingOptIn,
      })).unwrap();
      
      if (result) {
        showToast('Registration successful! Please verify your email.', 'success');
        navigation.navigate('VerifyEmail' as any, { email: values.email });
      }
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error');
    }
  };

>>>>>>> v.3.0
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
<<<<<<< HEAD
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.title}>Create Account</Title>
              <Paragraph style={styles.subtitle}>
                Join ModMaster Pro to start identifying parts
              </Paragraph>

              <View style={styles.nameRow}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(text) => updateFormData('firstName', text)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  error={!!errors.firstName}
                  disabled={isLoading}
                />
                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) => updateFormData('lastName', text)}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  error={!!errors.lastName}
                  disabled={isLoading}
                />
              </View>
              <HelperText type="error" visible={!!errors.firstName}>
                {errors.firstName}
              </HelperText>
              <HelperText type="error" visible={!!errors.lastName}>
                {errors.lastName}
              </HelperText>

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!errors.email}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!errors.email}>
=======
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Create Account
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Join ModMaster Pro to start identifying and purchasing vehicle parts
        </Text>

        <Formik
          initialValues={{
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          }}
          validationSchema={registerSchema}
          onSubmit={handleRegister}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            setFieldValue,
          }) => (
            <>
              <View style={styles.formContainer}>
                <View style={styles.nameContainer}>
                  <View style={styles.nameField}>
                <TextInput
                  label="First Name"
                      value={values.firstName}
                      onChangeText={handleChange('firstName')}
                      onBlur={handleBlur('firstName')}
                  mode="outlined"
                      left={<TextInput.Icon icon="account" />}
                      error={touched.firstName && !!errors.firstName}
                    />
                    <HelperText type="error" visible={touched.firstName && !!errors.firstName}>
                      {errors.firstName}
                    </HelperText>
                  </View>
                  
                  <View style={styles.nameField}>
                <TextInput
                  label="Last Name"
                      value={values.lastName}
                      onChangeText={handleChange('lastName')}
                      onBlur={handleBlur('lastName')}
                  mode="outlined"
                      error={touched.lastName && !!errors.lastName}
                    />
                    <HelperText type="error" visible={touched.lastName && !!errors.lastName}>
                {errors.lastName}
              </HelperText>
                  </View>
                </View>

              <TextInput
                label="Email"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                  autoComplete="email"
                  left={<TextInput.Icon icon="email" />}
                  error={touched.email && !!errors.email}
                style={styles.input}
              />
                <HelperText type="error" visible={touched.email && !!errors.email}>
>>>>>>> v.3.0
                {errors.email}
              </HelperText>

              <TextInput
                label="Phone (Optional)"
<<<<<<< HEAD
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                error={!!errors.phone}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!errors.phone}>
=======
                  value={values.phone}
                  onChangeText={handleChange('phone')}
                  onBlur={handleBlur('phone')}
                mode="outlined"
                keyboardType="phone-pad"
                  left={<TextInput.Icon icon="phone" />}
                  error={touched.phone && !!errors.phone}
                style={styles.input}
              />
                <HelperText type="error" visible={touched.phone && !!errors.phone}>
>>>>>>> v.3.0
                {errors.phone}
              </HelperText>

              <TextInput
                label="Password"
<<<<<<< HEAD
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                mode="outlined"
                secureTextEntry={!showPassword}
=======
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                mode="outlined"
                secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  left={<TextInput.Icon icon="lock" />}
>>>>>>> v.3.0
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
<<<<<<< HEAD
                style={styles.input}
                error={!!errors.password}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!errors.password}>
=======
                  error={touched.password && !!errors.password}
                style={styles.input}
                />
                {values.password && (
                  <View style={styles.passwordStrength}>
                    <ProgressBar
                      progress={getPasswordStrength(values.password)}
                      color={getPasswordStrengthColor(getPasswordStrength(values.password))}
                      style={styles.progressBar}
                    />
                    <Text style={styles.strengthText}>
                      {getPasswordStrengthText(getPasswordStrength(values.password))}
                    </Text>
                  </View>
                )}
                <HelperText type="error" visible={touched.password && !!errors.password}>
>>>>>>> v.3.0
                {errors.password}
              </HelperText>

              <TextInput
                label="Confirm Password"
<<<<<<< HEAD
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
=======
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  left={<TextInput.Icon icon="lock-check" />}
>>>>>>> v.3.0
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
<<<<<<< HEAD
                style={styles.input}
                error={!!errors.confirmPassword}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

              {error && (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleRegister}
=======
                  error={touched.confirmPassword && !!errors.confirmPassword}
                style={styles.input}
              />
                <HelperText type="error" visible={touched.confirmPassword && !!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFieldValue('acceptTerms', !values.acceptTerms)}
                >
                  <Checkbox
                    status={values.acceptTerms ? 'checked' : 'unchecked'}
                    onPress={() => setFieldValue('acceptTerms', !values.acceptTerms)}
                  />
                  <Text style={styles.checkboxText}>
                    I accept the{' '}
                    <Text style={{ color: theme.colors.primary }}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={{ color: theme.colors.primary }}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
                <HelperText type="error" visible={touched.acceptTerms && !!errors.acceptTerms}>
                  {errors.acceptTerms}
                </HelperText>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setMarketingOptIn(!marketingOptIn)}
                >
                  <Checkbox
                    status={marketingOptIn ? 'checked' : 'unchecked'}
                    onPress={() => setMarketingOptIn(!marketingOptIn)}
                  />
                  <Text style={styles.checkboxText}>
                    Send me updates about ModMaster Pro features and promotions
                  </Text>
                </TouchableOpacity>

              <Button
                mode="contained"
                  onPress={handleSubmit as any}
>>>>>>> v.3.0
                loading={isLoading}
                disabled={isLoading}
                style={styles.registerButton}
                contentStyle={styles.registerButtonContent}
              >
                Create Account
              </Button>
<<<<<<< HEAD
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Button
              mode="text"
              onPress={handleLogin}
              disabled={isLoading}
              style={styles.loginButton}
            >
              Sign In
            </Button>
          </View>
=======
              </View>
            </>
          )}
        </Formik>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <Button
            mode="outlined"
            icon="google"
            onPress={() => showToast('Google signup coming soon!', 'info')}
            style={styles.socialButton}
            contentStyle={styles.socialButtonContent}
          >
            Continue with Google
          </Button>
          
          {Platform.OS === 'ios' && (
            <Button
              mode="outlined"
              icon="apple"
              onPress={() => showToast('Apple signup coming soon!', 'info')}
              style={[styles.socialButton, styles.appleButton]}
              contentStyle={styles.socialButtonContent}
              labelStyle={{ color: '#000' }}
            >
              Continue with Apple
            </Button>
          )}
          </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as any)}>
            <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
>>>>>>> v.3.0
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
<<<<<<< HEAD
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  cardContent: {
    padding: 24,
=======
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
>>>>>>> v.3.0
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
<<<<<<< HEAD
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
=======
    flex: 1,
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  nameField: {
    flex: 1,
>>>>>>> v.3.0
  },
  input: {
    marginBottom: 8,
  },
<<<<<<< HEAD
  halfInput: {
    flex: 1,
  },
  registerButton: {
    marginTop: 16,
=======
  passwordStrength: {
    marginHorizontal: 5,
    marginBottom: 5,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 5,
  },
  strengthText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  registerButton: {
    marginTop: 20,
>>>>>>> v.3.0
    borderRadius: 8,
  },
  registerButtonContent: {
    paddingVertical: 8,
  },
<<<<<<< HEAD
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    opacity: 0.7,
  },
  loginButton: {
    marginLeft: 4,
=======
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#757575',
    fontSize: 14,
  },
  socialContainer: {
    marginBottom: 20,
  },
  socialButton: {
    marginBottom: 12,
    borderRadius: 8,
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#757575',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
>>>>>>> v.3.0
  },
});

export default RegisterScreen;