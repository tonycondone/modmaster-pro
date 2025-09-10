import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
<<<<<<< HEAD
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
import { apiService } from '@/services/apiService';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const navigation = useNavigation();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await apiService.post('/auth/forgot-password', { email: email.trim() });
      setIsSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login' as never);
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Title style={styles.title}>Check Your Email</Title>
                <Paragraph style={styles.subtitle}>
                  We've sent a password reset link to {email}
                </Paragraph>
                <Paragraph style={styles.instructions}>
                  Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                </Paragraph>

                <Button
                  mode="contained"
                  onPress={handleBackToLogin}
                  style={styles.backButton}
                  contentStyle={styles.backButtonContent}
                >
                  Back to Login
                </Button>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
=======
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import LottieView from 'lottie-react-native';

import { AppDispatch, RootState } from '../../store';
import { forgotPassword } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

const ForgotPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const [emailSent, setEmailSent] = useState(false);

  const handleForgotPassword = async (values: { email: string }) => {
    try {
      await dispatch(forgotPassword(values.email)).unwrap();
      setEmailSent(true);
      showToast('Password reset link sent to your email', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to send reset email', 'error');
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
        </View>

        <View style={styles.successContainer}>
          <LottieView
            source={require('../../../assets/animations/email-sent.json')}
            autoPlay
            loop={false}
            style={styles.successAnimation}
          />
          
          <Text style={[styles.successTitle, { color: theme.colors.primary }]}>
            Check Your Email
          </Text>
          
          <Text style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}>
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
          </Text>

          <Text style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}>
            Didn't receive the email? Check your spam folder or try resending.
          </Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login' as any)}
            style={styles.backButton}
            contentStyle={styles.backButtonContent}
          >
            Back to Login
          </Button>
        </View>
>>>>>>> v.3.0
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
<<<<<<< HEAD
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.title}>Reset Password</Title>
              <Paragraph style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Paragraph>

              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
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
=======
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LottieView
            source={require('../../../assets/animations/lock-animation.json')}
            autoPlay
            loop
            style={styles.lockAnimation}
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Forgot Password?
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          No worries! Enter your email address and we'll send you a link to reset your password.
        </Text>

        <Formik
          initialValues={{ email: '' }}
          validationSchema={forgotPasswordSchema}
          onSubmit={handleForgotPassword}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
          }) => (
            <View style={styles.formContainer}>
              <TextInput
                label="Email Address"
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
>>>>>>> v.3.0
              </HelperText>

              <Button
                mode="contained"
<<<<<<< HEAD
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={isLoading}
                style={styles.resetButton}
                contentStyle={styles.resetButtonContent}
              >
                Send Reset Link
              </Button>

              <Button
                mode="text"
                onPress={handleBackToLogin}
                disabled={isLoading}
                style={styles.backButton}
              >
                Back to Login
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
=======
                onPress={handleSubmit as any}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
              >
                Send Reset Link
              </Button>
            </View>
          )}
        </Formik>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login' as any)}
            compact
            labelStyle={{ color: theme.colors.primary }}
          >
            Sign In
          </Button>
        </View>
      </View>
>>>>>>> v.3.0
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
<<<<<<< HEAD
  scrollContent: {
    flexGrow: 1,
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  lockAnimation: {
    width: 120,
    height: 120,
>>>>>>> v.3.0
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
<<<<<<< HEAD
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 20,
=======
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 30,
>>>>>>> v.3.0
  },
  input: {
    marginBottom: 8,
  },
<<<<<<< HEAD
  resetButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  resetButtonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 8,
=======
  submitButton: {
    marginTop: 20,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#757575',
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successAnimation: {
    width: 200,
    height: 200,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  noteText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  backButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingHorizontal: 30,
>>>>>>> v.3.0
  },
  backButtonContent: {
    paddingVertical: 8,
  },
});

export default ForgotPasswordScreen;