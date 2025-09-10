import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  useTheme,
  HelperText,
  IconButton,
  ProgressBar,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import LottieView from 'lottie-react-native';

import { AppDispatch, RootState } from '../../store';
import { resetPassword } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

const resetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    )
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const ResetPasswordScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { token } = route.params || {};

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

  const handleResetPassword = async (values: { newPassword: string }) => {
    try {
      await dispatch(resetPassword({
        token,
        newPassword: values.newPassword,
      })).unwrap();
      setResetSuccess(true);
      showToast('Password reset successful!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to reset password', 'error');
    }
  };

  if (resetSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <LottieView
            source={require('../../../assets/animations/success-animation.json')}
            autoPlay
            loop={false}
            style={styles.successAnimation}
          />
          
          <Text style={[styles.successTitle, { color: theme.colors.primary }]}>
            Password Reset Successful!
          </Text>
          
          <Text style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login' as any)}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
          >
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            source={require('../../../assets/animations/reset-password-animation.json')}
            autoPlay
            loop
            style={styles.resetAnimation}
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Reset Password
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Please enter your new password. Make sure it's strong and unique!
        </Text>

        <Formik
          initialValues={{ newPassword: '', confirmPassword: '' }}
          validationSchema={resetPasswordSchema}
          onSubmit={handleResetPassword}
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
                label="New Password"
                value={values.newPassword}
                onChangeText={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
                mode="outlined"
                secureTextEntry={!showNewPassword}
                autoComplete="password-new"
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  />
                }
                error={touched.newPassword && !!errors.newPassword}
                style={styles.input}
              />
              
              {values.newPassword && (
                <View style={styles.passwordStrength}>
                  <ProgressBar
                    progress={getPasswordStrength(values.newPassword)}
                    color={getPasswordStrengthColor(getPasswordStrength(values.newPassword))}
                    style={styles.progressBar}
                  />
                  <Text style={styles.strengthText}>
                    {getPasswordStrengthText(getPasswordStrength(values.newPassword))}
                  </Text>
                </View>
              )}
              
              <HelperText type="error" visible={touched.newPassword && !!errors.newPassword}>
                {errors.newPassword}
              </HelperText>

              <TextInput
                label="Confirm New Password"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                left={<TextInput.Icon icon="lock-check" />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                error={touched.confirmPassword && !!errors.confirmPassword}
                style={styles.input}
              />
              <HelperText type="error" visible={touched.confirmPassword && !!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleSubmit as any}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
              >
                Reset Password
              </Button>
            </View>
          )}
        </Formik>

        <View style={styles.tipsContainer}>
          <Text style={[styles.tipsTitle, { color: theme.colors.primary }]}>
            Password Tips:
          </Text>
          <Text style={styles.tipText}>• Use at least 8 characters</Text>
          <Text style={styles.tipText}>• Include uppercase and lowercase letters</Text>
          <Text style={styles.tipText}>• Add numbers and special characters</Text>
          <Text style={styles.tipText}>• Avoid common words or personal info</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  resetAnimation: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
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
  submitButton: {
    marginTop: 20,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  tipsContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  loginButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingHorizontal: 50,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
});

export default ResetPasswordScreen;