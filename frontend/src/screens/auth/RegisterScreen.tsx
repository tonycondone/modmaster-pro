import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { register } from '../../store/slices/authSlice';
import { colors, fonts, spacing } from '../../theme';
import Logo from '../../components/Logo';

const registerSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
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
  phone: Yup.string()
    .matches(/^[0-9]{10,}$/, 'Phone number must be at least 10 digits')
    .optional()
});

export default function RegisterScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { loading } = useSelector((state: any) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handleRegister = async (values: any) => {
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions to continue.');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const { confirmPassword, ...registerData } = values;
      await dispatch(register({
        ...registerData,
        first_name: values.firstName,
        last_name: values.lastName
      })).unwrap();
      
      Alert.alert(
        'Registration Successful!',
        'Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('LoginScreen')
          }
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color={colors.white} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Logo size={60} />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join the ModMaster Pro community</Text>
            </View>

            <Formik
              initialValues={{
                firstName: '',
                lastName: '',
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                phone: ''
              }}
              validationSchema={registerSchema}
              onSubmit={handleRegister}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.formContainer}>
                  <View style={styles.nameContainer}>
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Icon name="account-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        placeholderTextColor={colors.textSecondary}
                        value={values.firstName}
                        onChangeText={handleChange('firstName')}
                        onBlur={handleBlur('firstName')}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        placeholderTextColor={colors.textSecondary}
                        value={values.lastName}
                        onChangeText={handleChange('lastName')}
                        onBlur={handleBlur('lastName')}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                  {(touched.firstName && errors.firstName) || (touched.lastName && errors.lastName) ? (
                    <Text style={styles.errorText}>
                      {errors.firstName || errors.lastName}
                    </Text>
                  ) : null}

                  <View style={styles.inputContainer}>
                    <Icon name="at" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor={colors.textSecondary}
                      value={values.username}
                      onChangeText={handleChange('username')}
                      onBlur={handleBlur('username')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                  {touched.username && errors.username && (
                    <Text style={styles.errorText}>{errors.username}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Icon name="email-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor={colors.textSecondary}
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="next"
                    />
                  </View>
                  {touched.email && errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Icon name="phone-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone Number (Optional)"
                      placeholderTextColor={colors.textSecondary}
                      value={values.phone}
                      onChangeText={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                  </View>
                  {touched.phone && errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Icon name="lock-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={colors.textSecondary}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Icon
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <Icon name="lock-check-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor={colors.textSecondary}
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSubmit()}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeIcon}
                    >
                      <Icon
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.termsContainer}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                  >
                    <Icon
                      name={acceptedTerms ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={acceptedTerms ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text
                        style={styles.termsLink}
                        onPress={() => navigation.navigate('TermsScreen')}
                      >
                        Terms of Service
                      </Text>
                      {' and '}
                      <Text
                        style={styles.termsLink}
                        onPress={() => navigation.navigate('PrivacyScreen')}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                    onPress={() => handleSubmit()}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#e94560', '#ff6b6b']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.registerButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.registerButtonText}>Create Account</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </Formik>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.xl
  },
  content: {
    paddingHorizontal: spacing.lg
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white,
    marginTop: spacing.md
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  formContainer: {
    marginBottom: spacing.lg
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  halfInput: {
    flex: 0.48
  },
  inputIcon: {
    marginRight: spacing.sm
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.white
  },
  eyeIcon: {
    padding: spacing.xs
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontFamily: fonts.regular,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.md
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginLeft: spacing.xs
  },
  termsLink: {
    color: colors.primary,
    fontFamily: fonts.medium
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm
  },
  registerButtonDisabled: {
    opacity: 0.7
  },
  registerButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.semiBold
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: fonts.regular
  },
  loginLink: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: fonts.semiBold
  }
});