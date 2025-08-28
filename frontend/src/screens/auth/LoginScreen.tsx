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
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { login } from '../../store/slices/authSlice';
import { colors, fonts, spacing } from '../../theme';
import Logo from '../../components/Logo';
import SocialLoginButtons from '../../components/SocialLoginButtons';

const { width } = Dimensions.get('window');

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required')
});

export default function LoginScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: any) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await dispatch(login({ ...values, rememberMe })).unwrap();
      
      if (result.requiresTwoFactor) {
        navigation.navigate('TwoFactorScreen', { sessionToken: result.sessionToken });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      }
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err.message || 'Invalid email or password. Please try again.',
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
            <View style={styles.logoContainer}>
              <Logo size={80} />
              <Text style={styles.title}>ModMaster Pro</Text>
              <Text style={styles.subtitle}>Automotive Intelligence Platform</Text>
            </View>

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={loginSchema}
              onSubmit={handleLogin}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.formContainer}>
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
                    <Icon name="lock-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={colors.textSecondary}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSubmit()}
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

                  <View style={styles.optionsContainer}>
                    <TouchableOpacity
                      style={styles.rememberContainer}
                      onPress={() => setRememberMe(!rememberMe)}
                    >
                      <Icon
                        name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={rememberMe ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.rememberText}>Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('ForgotPasswordScreen')}
                    >
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                    onPress={() => handleSubmit()}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#e94560', '#ff6b6b']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </Formik>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <SocialLoginButtons />

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
    justifyContent: 'center',
    paddingVertical: spacing.xl
  },
  content: {
    paddingHorizontal: spacing.lg
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl
  },
  title: {
    fontSize: 32,
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginLeft: spacing.xs
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fonts.medium
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.sm
  },
  loginButtonDisabled: {
    opacity: 0.7
  },
  loginButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.semiBold
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginHorizontal: spacing.md
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg
  },
  signupText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: fonts.regular
  },
  signupLink: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: fonts.semiBold
  }
});