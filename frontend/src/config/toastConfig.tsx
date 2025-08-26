import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.successToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
      )}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[styles.toast, styles.errorToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <MaterialCommunityIcons name="alert-circle" size={24} color="#F44336" />
      )}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={[styles.toast, styles.infoToast]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastTitle}
      text2Style={styles.toastMessage}
      renderLeadingIcon={() => (
        <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
      )}
    />
  ),
};

const styles = StyleSheet.create({
  toast: {
    borderLeftWidth: 5,
    paddingHorizontal: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  successToast: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  errorToast: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  infoToast: {
    borderLeftColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  toastContent: {
    paddingHorizontal: 10,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  toastMessage: {
    fontSize: 14,
    color: '#666',
  },
});