import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const theme = useTheme();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    // Animate logo appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryContainer]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.gear,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <Image
              source={require('../../assets/gear.png')}
              style={styles.gearImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
        
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          ModMaster Pro
        </Animated.Text>
        
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          AI-Powered Vehicle Parts Identification
        </Animated.Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                width: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Loading your garage...
        </Animated.Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoWrapper: {
    position: 'relative',
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  gear: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
  },
  gearImage: {
    width: '100%',
    height: '100%',
    tintColor: '#ffffff',
    opacity: 0.8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.8,
  },
});

export default SplashScreen;