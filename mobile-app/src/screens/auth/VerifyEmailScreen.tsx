import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Button,
  Text,
  useTheme,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import { AppDispatch, RootState } from '../../store';
import { verifyEmail, resendVerificationEmail } from '../../store/slices/authSlice';
import { showToast } from '../../utils/toast';

const VerifyEmailScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const { email } = route.params || {};

  useEffect(() => {
    // Start resend timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');
    
    if (fullCode.length !== 6) {
      showToast('Please enter the complete 6-digit code', 'error');
      return;
    }

    try {
      await dispatch(verifyEmail({
        email,
        code: fullCode,
      })).unwrap();
      
      setVerificationSuccess(true);
      showToast('Email verified successfully!', 'success');
      
      // Navigate to main app after a delay
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as any }],
        });
      }, 2000);
    } catch (error: any) {
      showToast(error.message || 'Verification failed', 'error');
    }
  };

  const handleResend = async () => {
    try {
      await dispatch(resendVerificationEmail(email)).unwrap();
      showToast('Verification code resent', 'success');
      
      // Reset timer
      setResendTimer(60);
      setCanResend(false);
      
      // Clear code inputs
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      showToast(error.message || 'Failed to resend code', 'error');
    }
  };

  if (verificationSuccess) {
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
            Email Verified!
          </Text>
          
          <Text style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}>
            Your email has been successfully verified. Redirecting to the app...
          </Text>
          
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
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
            source={require('../../../assets/animations/email-verification-animation.json')}
            autoPlay
            loop
            style={styles.emailAnimation}
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Verify Your Email
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          We've sent a 6-digit verification code to
        </Text>
        
        <Text style={[styles.email, { color: theme.colors.primary }]}>
          {email}
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => inputRefs.current[index] = ref}
              style={[
                styles.codeInput,
                { 
                  borderColor: digit ? theme.colors.primary : '#ddd',
                  backgroundColor: digit ? theme.colors.primaryContainer : '#fff',
                }
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value.replace(/[^0-9]/g, ''), index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              textAlign="center"
            />
          ))}
        </View>

        <Button
          mode="contained"
          onPress={() => handleVerify()}
          loading={isLoading}
          disabled={isLoading || code.some(d => d === '')}
          style={styles.verifyButton}
          contentStyle={styles.verifyButtonContent}
        >
          Verify Email
        </Button>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
          </Text>
          {canResend ? (
            <Button
              mode="text"
              onPress={handleResend}
              compact
              labelStyle={{ color: theme.colors.primary }}
            >
              Resend Code
            </Button>
          ) : (
            <Text style={[styles.timerText, { color: theme.colors.primary }]}>
              Resend in {resendTimer}s
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Wrong email address?{' '}
          </Text>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            compact
            labelStyle={{ color: theme.colors.primary }}
          >
            Go Back
          </Button>
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
  emailAnimation: {
    width: 150,
    height: 150,
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
    marginBottom: 5,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 10,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  verifyButton: {
    marginBottom: 20,
    borderRadius: 8,
  },
  verifyButtonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  resendText: {
    fontSize: 14,
    color: '#757575',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  loader: {
    marginTop: 20,
  },
});

export default VerifyEmailScreen;