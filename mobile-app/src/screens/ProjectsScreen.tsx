import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image
} from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  FAB,
  Chip,
  ProgressBar,
  IconButton,
  Avatar,
  Button,
  Menu,
  Divider,
  Portal,
  Modal,
  TextInput,
  SegmentedButtons
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { 
  FadeInDown, 
  FadeOutUp,
  Layout 
} from 'react-native-reanimated';
import { RootState } from '../store';
import { 
  fetchProjects, 
  createProject, 
  updateProject,
  deleteProject 
} from '../store/slices/projectSlice';
import { formatCurrency, formatDate } from '../utils/formatters';

const { width } = Dimensions.get('window');

interface Project {
  id: string;
  name: string;
  description: string;
  vehicleId: string;
  status: 'planning' | 'in_progress' | 'completed' | 'paused';
  budget: number;
  spent: number;
  startDate: string;
  targetDate?: string;
  completedDate?: string;
  parts: Array<{
    id: string;
    partId: string;
    name: string;
    status: 'planned' | 'ordered' | 'received' | 'installed';
    price: number;
    quantity: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
  }>;
  images: string[];
  notes: string;
  progress: number;
}

export const ProjectsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { projects, isLoading } = useSelector((state: RootState) => state.projects);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProjects());
  }, []);

  const filteredProjects = projects.filter(project => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'active') return ['planning', 'in_progress', 'paused'].includes(project.status);
    if (selectedFilter === 'completed') return project.status === 'completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return theme.colors.tertiary;
      case 'in_progress':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.primary;
      case 'paused':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning':
        return 'lightbulb-outline';
      case 'in_progress':
        return 'progress-clock';
      case 'completed':
        return 'check-circle';
      case 'paused':
        return 'pause-circle';
      default:
        return 'circle';
    }
  };

  const calculateProgress = (project: Project) => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.completed).length;
    const installedParts = project.parts.filter(p => p.status === 'installed').length;
    const totalParts = project.parts.length;
    
    if (totalTasks === 0 && totalParts === 0) return 0;
    
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 50 : 0;
    const partProgress = totalParts > 0 ? (installedParts / totalParts) * 50 : 0;
    
    return taskProgress + partProgress;
  };

  const handleCreateProject = () => {
    navigation.navigate('CreateProject', { fromDashboard: true });
    setShowCreateModal(false);
  };

  const handleProjectPress = (project: Project) => {
    navigation.navigate('ProjectDetail', { projectId: project.id });
  };

  const handleMenuAction = (action: string, project: Project) => {
    setMenuVisible(null);
    
    switch (action) {
      case 'edit':
        navigation.navigate('EditProject', { projectId: project.id });
        break;
      case 'duplicate':
        // Duplicate project logic
        break;
      case 'delete':
        // Show confirmation dialog
        dispatch(deleteProject(project.id));
        break;
    }
  };

  const renderProjectCard = (project: Project) => {
    const vehicle = vehicles.find(v => v.id === project.vehicleId);
    const progress = calculateProgress(project);
    const budgetUsed = project.budget > 0 ? (project.spent / project.budget) * 100 : 0;

    return (
      <Animated.View
        key={project.id}
        entering={FadeInDown}
        exiting={FadeOutUp}
        layout={Layout}
      >
        <TouchableOpacity onPress={() => handleProjectPress(project)}>
          <Surface style={styles.projectCard} elevation={2}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Avatar.Icon
                  size={40}
                  icon={getStatusIcon(project.status)}
                  style={{ backgroundColor: getStatusColor(project.status) + '20' }}
                  color={getStatusColor(project.status)}
                />
                <View style={styles.headerText}>
                  <Text variant="titleMedium" style={styles.projectName}>
                    {project.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.vehicleName}>
                    {vehicle?.nickname || `${vehicle?.make} ${vehicle?.model}`}
                  </Text>
                </View>
              </View>
              <Menu
                visible={menuVisible === project.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setMenuVisible(project.id)}
                  />
                }
              >
                <Menu.Item 
                  onPress={() => handleMenuAction('edit', project)} 
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Menu.Item 
                  onPress={() => handleMenuAction('duplicate', project)} 
                  title="Duplicate"
                  leadingIcon="content-copy"
                />
                <Divider />
                <Menu.Item 
                  onPress={() => handleMenuAction('delete', project)} 
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: theme.colors.error }}
                />
              </Menu>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text variant="labelSmall" style={styles.progressLabel}>
                  Progress
                </Text>
                <Text variant="labelSmall" style={styles.progressValue}>
                  {Math.round(progress)}%
                </Text>
              </View>
              <ProgressBar 
                progress={progress / 100} 
                style={styles.progressBar}
                color={theme.colors.primary}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialCommunityIcons 
                  name="package-variant" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {project.parts.filter(p => p.status === 'installed').length}/{project.parts.length} parts
                </Text>
              </View>
              
              <View style={styles.stat}>
                <MaterialCommunityIcons 
                  name="checkbox-marked-circle-outline" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {project.tasks.filter(t => t.completed).length}/{project.tasks.length} tasks
                </Text>
              </View>
              
              <View style={styles.stat}>
                <MaterialCommunityIcons 
                  name="cash" 
                  size={16} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.statText}>
                  {formatCurrency(project.spent)}/{formatCurrency(project.budget)}
                </Text>
              </View>
            </View>

            {/* Budget Bar */}
            {project.budget > 0 && (
              <View style={styles.budgetSection}>
                <ProgressBar 
                  progress={Math.min(budgetUsed / 100, 1)} 
                  style={styles.budgetBar}
                  color={budgetUsed > 90 ? theme.colors.error : theme.colors.tertiary}
                />
                {budgetUsed > 90 && (
                  <Text variant="labelSmall" style={styles.budgetWarning}>
                    {budgetUsed > 100 ? 'Over budget!' : 'Near budget limit'}
                  </Text>
                )}
              </View>
            )}

            {/* Images Preview */}
            {project.images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesPreview}
              >
                {project.images.slice(0, 5).map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={styles.previewImage}
                  />
                ))}
                {project.images.length > 5 && (
                  <Surface style={styles.moreImages} elevation={1}>
                    <Text variant="labelLarge">+{project.images.length - 5}</Text>
                  </Surface>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Chip 
                compact 
                style={[styles.statusChip, { backgroundColor: getStatusColor(project.status) + '20' }]}
                textStyle={{ color: getStatusColor(project.status) }}
              >
                {project.status.replace('_', ' ')}
              </Chip>
              
              <Text variant="labelSmall" style={styles.dateText}>
                {project.status === 'completed' && project.completedDate
                  ? `Completed ${formatDate(project.completedDate)}`
                  : project.targetDate
                  ? `Target: ${formatDate(project.targetDate)}`
                  : `Started ${formatDate(project.startDate)}`
                }
              </Text>
            </View>
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          My Projects
        </Text>
        <SegmentedButtons
          value={selectedFilter}
          onValueChange={setSelectedFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' }
          ]}
          style={styles.filterButtons}
        />
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map(renderProjectCard)
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="folder-open-outline" 
              size={80} 
              color={theme.colors.onSurfaceDisabled} 
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Projects Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Start your first modification project to track progress and manage your build.
            </Text>
            <Button 
              mode="contained" 
              onPress={handleCreateProject}
              style={styles.createButton}
            >
              Create First Project
            </Button>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {filteredProjects.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreateProject}
          label="New Project"
        />
      )}

      {/* Quick Stats */}
      {projects.length > 0 && (
        <Surface style={styles.quickStats} elevation={3}>
          <View style={styles.quickStat}>
            <Text variant="headlineMedium" style={styles.quickStatValue}>
              {projects.filter(p => p.status === 'in_progress').length}
            </Text>
            <Text variant="labelSmall" style={styles.quickStatLabel}>
              Active
            </Text>
          </View>
          <Divider style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text variant="headlineMedium" style={styles.quickStatValue}>
              {formatCurrency(projects.reduce((sum, p) => sum + p.spent, 0))}
            </Text>
            <Text variant="labelSmall" style={styles.quickStatLabel}>
              Total Spent
            </Text>
          </View>
          <Divider style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text variant="headlineMedium" style={styles.quickStatValue}>
              {projects.filter(p => p.status === 'completed').length}
            </Text>
            <Text variant="labelSmall" style={styles.quickStatLabel}>
              Completed
            </Text>
          </View>
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterButtons: {
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  projectCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  projectName: {
    fontWeight: '600',
  },
  vehicleName: {
    opacity: 0.6,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    opacity: 0.6,
  },
  progressValue: {
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    opacity: 0.8,
  },
  budgetSection: {
    marginBottom: 12,
  },
  budgetBar: {
    height: 4,
    borderRadius: 2,
  },
  budgetWarning: {
    color: 'red',
    marginTop: 4,
  },
  imagesPreview: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  moreImages: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    height: 24,
  },
  dateText: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
  },
  quickStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontWeight: 'bold',
  },
  quickStatLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
});