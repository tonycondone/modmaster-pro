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
  useTheme,
  HelperText,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { login, clearError } from '@/store/slices/authSlice';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import LottieView from 'lottie-react-native';

import { AppDispatch, RootState } from '../../store';
import { login } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const LoginScreen: React.FC = () => {
>>>>>>> v.3.0
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
<<<<<<< HEAD

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      // Navigation will be handled by the RootNavigator based on auth state
    } catch (error: any) {
      Alert.alert('Login Failed', error || 'An error occurred during login');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleRegister = () => {
    navigation.navigate('Register' as never);
  };

=======
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      const result = await dispatch(login({ ...values, rememberMe })).unwrap();
      if (result) {
        showToast('Welcome back!', 'success');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as any }],
        });
      }
    } catch (error: any) {
      // Shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      showToast(error.message || 'Login failed', 'error');
    }
  };

>>>>>>> v.3.0
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
<<<<<<< HEAD
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.title}>Welcome Back</Title>
              <Paragraph style={styles.subtitle}>
                Sign in to your ModMaster Pro account
              </Paragraph>

              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                  dispatch(clearError());
                }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                error={!!emailError}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>

              <TextInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                  dispatch(clearError());
                }}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                error={!!passwordError}
                disabled={isLoading}
              />
              <HelperText type="error" visible={!!passwordError}>
                {passwordError}
              </HelperText>

              {error && (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
              >
                Sign In
              </Button>

              <Button
                mode="text"
                onPress={handleForgotPassword}
                disabled={isLoading}
                style={styles.forgotButton}
              >
                Forgot Password?
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Button
              mode="text"
              onPress={handleRegister}
              disabled={isLoading}
              style={styles.registerButton}
            >
              Sign Up
            </Button>
          </View>
=======
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <LottieView
            source={require('../../../assets/animations/car-animation.json')}
            autoPlay
            loop
            style={styles.animation}
          />
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            ModMaster Pro
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Welcome back! Sign in to continue
          </Text>
        </View>

        <Animated.View
          style={[
            styles.formContainer,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <>
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
                  {errors.email}
                </HelperText>

                <TextInput
                  label="Password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  error={touched.password && !!errors.password}
                  style={styles.input}
                />
                <HelperText type="error" visible={touched.password && !!errors.password}>
                  {errors.password}
                </HelperText>

                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={styles.rememberMe}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <Checkbox
                      status={rememberMe ? 'checked' : 'unchecked'}
                      onPress={() => setRememberMe(!rememberMe)}
                    />
                    <Text>Remember me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword' as any)}
                  >
                    <Text style={[styles.forgotPassword, { color: theme.colors.primary }]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </View>

                <Button
                  mode="contained"
                  onPress={handleSubmit as any}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                >
                  Sign In
                </Button>
              </>
            )}
          </Formik>
        </Animated.View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <IconButton
            icon="google"
            size={30}
            style={styles.socialButton}
            onPress={() => showToast('Google login coming soon!', 'info')}
          />
          <IconButton
            icon="apple"
            size={30}
            style={styles.socialButton}
            onPress={() => showToast('Apple login coming soon!', 'info')}
          />
          <IconButton
            icon="facebook"
            size={30}
            style={styles.socialButton}
            onPress={() => showToast('Facebook login coming soon!', 'info')}
          />
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register' as any)}>
            <Text style={[styles.signupLink, { color: theme.colors.primary }]}>
              Sign Up
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
=======
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  animation: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
>>>>>>> v.3.0
  },
  input: {
    marginBottom: 8,
  },
<<<<<<< HEAD
=======
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '600',
  },
>>>>>>> v.3.0
  loginButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
<<<<<<< HEAD
  forgotButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    opacity: 0.7,
  },
  registerButton: {
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
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#757575',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
>>>>>>> v.3.0
  },
});

export default LoginScreen;