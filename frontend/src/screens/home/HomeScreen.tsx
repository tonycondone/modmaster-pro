import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Surface, 
  Text, 
  Card, 
  Button, 
  useTheme,
  Searchbar,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store';

export const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAppSelector(state => state.auth);
  const [searchQuery, setSearchQuery] = React.useState('');

  const quickActions = [
    { icon: 'camera', label: 'Scan Part', action: () => navigation.navigate('Scan') },
    { icon: 'car', label: 'My Garage', action: () => navigation.navigate('Garage') },
    { icon: 'trending-up', label: 'Trending', action: () => {} },
    { icon: 'tag', label: 'Deals', action: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
              Welcome back,
            </Text>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
              {user?.firstName || user?.username || 'Enthusiast'}!
            </Text>
          </View>
          <IconButton
            icon="bell"
            size={28}
            onPress={() => {}}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search parts, vehicles, or projects..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <Surface key={index} style={styles.actionCard} elevation={2}>
              <IconButton
                icon={action.icon}
                size={32}
                onPress={action.action}
                iconColor={theme.colors.primary}
              />
              <Text variant="bodySmall">{action.label}</Text>
            </Surface>
          ))}
        </View>

        {/* Featured Section */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Featured Parts
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3].map((item) => (
              <Card key={item} style={styles.featuredCard}>
                <Card.Cover source={{ uri: 'https://via.placeholder.com/300x200' }} />
                <Card.Content>
                  <Text variant="titleMedium">Performance Exhaust</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                    $599.99
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          <Card style={styles.activityCard}>
            <Card.Content>
              <Text variant="titleMedium">Engine Bay Scan</Text>
              <Text variant="bodyMedium">2 hours ago • 15 parts identified</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="text">View Results</Button>
            </Card.Actions>
          </Card>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Recommended for You
          </Text>
          {[1, 2].map((item) => (
            <Card key={item} style={styles.recommendationCard}>
              <Card.Content style={styles.recommendationContent}>
                <View style={styles.recommendationText}>
                  <Text variant="titleMedium">Cold Air Intake</Text>
                  <Text variant="bodySmall">+15HP • Better throttle response</Text>
                  <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
                    $249.99
                  </Text>
                </View>
                <Card.Cover 
                  source={{ uri: 'https://via.placeholder.com/100x100' }} 
                  style={styles.recommendationImage}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchBar: {
    elevation: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredCard: {
    width: 200,
    marginLeft: 16,
    marginRight: 8,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  recommendationCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  recommendationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationText: {
    flex: 1,
  },
  recommendationImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});