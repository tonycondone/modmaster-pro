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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              </HelperText>

              <Button
                mode="contained"
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
    marginBottom: 16,
    opacity: 0.7,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 20,
  },
  input: {
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  resetButtonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 8,
  },
  backButtonContent: {
    paddingVertical: 8,
  },
});

export default ForgotPasswordScreen;