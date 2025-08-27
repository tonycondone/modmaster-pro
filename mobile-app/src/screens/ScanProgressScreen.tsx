import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  ProgressBar,
  Button,
  Chip,
  ActivityIndicator,
  List,
  Avatar
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { RootState } from '../store';
import { getScanStatus, subscribeScanUpdates } from '../services/scanService';

const { width } = Dimensions.get('window');

interface ScanProgressScreenProps {
  route: {
    params: {
      scanId: string;
      vehicleId: string;
      scanType: string;
    };
  };
}

const SCAN_STAGES = [
  { id: 'upload', label: 'Uploading Image', icon: 'cloud-upload' },
  { id: 'preprocessing', label: 'Preprocessing', icon: 'image-filter' },
  { id: 'detection', label: 'Detecting Parts', icon: 'magnify-scan' },
  { id: 'analysis', label: 'AI Analysis', icon: 'brain' },
  { id: 'matching', label: 'Matching Database', icon: 'database-search' },
  { id: 'complete', label: 'Complete', icon: 'check-circle' }
];

export const ScanProgressScreen: React.FC<ScanProgressScreenProps> = ({ route }) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { scanId, vehicleId, scanType } = route.params;
  
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();

    // Subscribe to real-time updates
    const unsubscribe = subscribeScanUpdates(scanId, (update) => {
      if (update.progress) {
        setProgress(update.progress / 100);
        
        // Calculate current stage based on progress
        const stageIndex = Math.floor((update.progress / 100) * (SCAN_STAGES.length - 1));
        setCurrentStage(stageIndex);
      }
      
      if (update.status === 'completed') {
        setStatus('completed');
        setResults(update.results);
        setCurrentStage(SCAN_STAGES.length - 1);
        setProgress(1);
      } else if (update.status === 'failed') {
        setStatus('failed');
        setError(update.error || 'Scan processing failed');
      }
    });

    // Simulate progress for demo
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 0.95) {
          clearInterval(interval);
          // Navigate to results after a delay
          setTimeout(() => {
            navigation.replace('ScanResults', {
              scanId,
              vehicleId,
              scanType
            });
          }, 1500);
          return 1;
        }
        return p + 0.05;
      });
    }, 1000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [scanId]);

  const handleRetry = () => {
    navigation.goBack();
  };

  const handleViewResults = () => {
    navigation.replace('ScanResults', {
      scanId,
      vehicleId,
      scanType,
      results
    });
  };

  if (status === 'failed') {
    return (
      <View style={styles.container}>
        <Surface style={styles.errorCard} elevation={3}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={64} 
            color={theme.colors.error} 
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Scan Failed
          </Text>
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
          <View style={styles.errorActions}>
            <Button mode="outlined" onPress={() => navigation.goBack()}>
              Go Back
            </Button>
            <Button mode="contained" onPress={handleRetry}>
              Try Again
            </Button>
          </View>
        </Surface>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View 
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Animation */}
        <View style={styles.animationContainer}>
          {status === 'processing' ? (
            <LottieView
              source={require('../assets/animations/scanning.json')}
              autoPlay
              loop
              style={styles.animation}
            />
          ) : (
            <LottieView
              source={require('../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={styles.animation}
            />
          )}
        </View>

        {/* Title */}
        <Text variant="headlineMedium" style={styles.title}>
          {status === 'processing' ? 'Analyzing Your Scan' : 'Scan Complete!'}
        </Text>
        
        <Text variant="bodyLarge" style={styles.subtitle}>
          {status === 'processing' 
            ? 'Our AI is identifying parts and analyzing your vehicle...'
            : `Found ${results?.identifiedParts?.length || 0} parts in your ${scanType.replace('_', ' ')}`
          }
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={progress} 
            style={styles.progressBar}
            theme={{ colors: { primary: theme.colors.primary } }}
          />
          <Text variant="labelSmall" style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* Stages */}
        <Surface style={styles.stagesCard} elevation={2}>
          {SCAN_STAGES.map((stage, index) => {
            const isActive = index === currentStage;
            const isComplete = index < currentStage || status === 'completed';
            
            return (
              <List.Item
                key={stage.id}
                title={stage.label}
                left={() => (
                  <Avatar.Icon
                    size={40}
                    icon={stage.icon}
                    style={[
                      styles.stageIcon,
                      isComplete && styles.stageIconComplete,
                      isActive && styles.stageIconActive
                    ]}
                  />
                )}
                right={() => (
                  isActive && status === 'processing' ? (
                    <ActivityIndicator size="small" />
                  ) : isComplete ? (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                  ) : null
                )}
                style={[
                  styles.stageItem,
                  isActive && styles.stageItemActive
                ]}
                titleStyle={[
                  styles.stageTitle,
                  (isActive || isComplete) && styles.stageTitleActive
                ]}
              />
            );
          })}
        </Surface>

        {/* Quick Facts */}
        {status === 'processing' && (
          <Surface style={styles.factsCard} elevation={1}>
            <Text variant="titleMedium" style={styles.factsTitle}>
              Did You Know?
            </Text>
            <Text variant="bodyMedium" style={styles.factText}>
              Our AI model can identify over 100 different automotive parts with 95% accuracy!
            </Text>
          </Surface>
        )}

        {/* Action Buttons */}
        {status === 'completed' && (
          <View style={styles.actions}>
            <Button 
              mode="contained" 
              onPress={handleViewResults}
              style={styles.actionButton}
            >
              View Results
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('Home')}
              style={styles.actionButton}
            >
              Go to Dashboard
            </Button>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  animatedContainer: {
    flex: 1,
  },
  animationContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: 200,
    height: 200,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
  stagesCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  stageItem: {
    paddingVertical: 12,
  },
  stageItemActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  stageIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  stageIconComplete: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  stageIconActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  stageTitle: {
    opacity: 0.5,
  },
  stageTitleActive: {
    opacity: 1,
    fontWeight: '500',
  },
  factsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  factsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  factText: {
    opacity: 0.7,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginVertical: 6,
  },
  errorCard: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
});