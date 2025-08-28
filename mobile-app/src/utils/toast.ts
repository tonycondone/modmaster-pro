import { ToastAndroid, Platform, Alert } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: 'short' | 'long';
  position?: 'top' | 'center' | 'bottom';
}

/**
 * Show a toast message
 * @param message - Message to display
 * @param type - Type of toast (success, error, info, warning)
 * @param options - Additional options
 */
export const showToast = (
  message: string,
  type: ToastType = 'info',
  options?: ToastOptions
) => {
  const { duration = 'short', position = 'bottom' } = options || {};

  if (Platform.OS === 'android') {
    const androidDuration =
      duration === 'short' ? ToastAndroid.SHORT : ToastAndroid.LONG;
    
    let androidPosition;
    switch (position) {
      case 'top':
        androidPosition = ToastAndroid.TOP;
        break;
      case 'center':
        androidPosition = ToastAndroid.CENTER;
        break;
      default:
        androidPosition = ToastAndroid.BOTTOM;
    }

    ToastAndroid.showWithGravity(
      message,
      androidDuration,
      androidPosition
    );
  } else {
    // For iOS, use Alert as a fallback
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    Alert.alert(title, message, [{ text: 'OK' }]);
  }
};

/**
 * Show success toast
 * @param message - Success message
 * @param options - Toast options
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'success', options);
};

/**
 * Show error toast
 * @param message - Error message
 * @param options - Toast options
 */
export const showErrorToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'error', options);
};

/**
 * Show info toast
 * @param message - Info message
 * @param options - Toast options
 */
export const showInfoToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'info', options);
};

/**
 * Show warning toast
 * @param message - Warning message
 * @param options - Toast options
 */
export const showWarningToast = (message: string, options?: ToastOptions) => {
  showToast(message, 'warning', options);
};