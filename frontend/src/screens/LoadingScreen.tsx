import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export const LoadingScreen = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="titleMedium" style={styles.text}>
        ModMaster Pro
      </Text>
      <Text variant="bodyMedium" style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>
        Loading your garage...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 24,
  },
  subtext: {
    marginTop: 8,
  },
});