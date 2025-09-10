import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import {
  Storage,
  Memory,
  Speed,
  Cloud,
  CheckCircle,
  Warning,
  Error,
  Refresh,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const SystemPage: React.FC = () => {
  const { data: systemInfo, refetch } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: async () => {
      const response = await api.get('/admin/system/info');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">System Health</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  CPU Usage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {systemInfo?.cpu.usage || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={systemInfo?.cpu.usage || 0}
                color={
                  (systemInfo?.cpu.usage || 0) > 80
                    ? 'error'
                    : (systemInfo?.cpu.usage || 0) > 60
                    ? 'warning'
                    : 'success'
                }
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Memory sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Memory Usage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {systemInfo?.memory.usagePercent || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={systemInfo?.memory.usagePercent || 0}
                color={
                  (systemInfo?.memory.usagePercent || 0) > 80
                    ? 'error'
                    : (systemInfo?.memory.usagePercent || 0) > 60
                    ? 'warning'
                    : 'success'
                }
              />
              <Typography variant="caption" color="textSecondary">
                {systemInfo?.memory.used || 0}GB / {systemInfo?.memory.total || 0}GB
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Storage sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Disk Usage
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {systemInfo?.disk.usagePercent || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={systemInfo?.disk.usagePercent || 0}
                color={
                  (systemInfo?.disk.usagePercent || 0) > 80
                    ? 'error'
                    : (systemInfo?.disk.usagePercent || 0) > 60
                    ? 'warning'
                    : 'success'
                }
              />
              <Typography variant="caption" color="textSecondary">
                {systemInfo?.disk.used || 0}GB / {systemInfo?.disk.total || 0}GB
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Cloud sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Network
                </Typography>
              </Box>
              <Typography variant="h4">
                {systemInfo?.network.status || 'Unknown'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Latency: {systemInfo?.network.latency || 0}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Services Status */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Services Status
            </Typography>
            <List>
              {systemInfo?.services.map((service: any) => (
                <ListItem key={service.name}>
                  <ListItemIcon>{getStatusIcon(service.status)}</ListItemIcon>
                  <ListItemText
                    primary={service.name}
                    secondary={`Uptime: ${service.uptime}`}
                  />
                  <Chip
                    label={service.status}
                    size="small"
                    color={getStatusColor(service.status)}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent System Events
            </Typography>
            <List>
              {systemInfo?.events.map((event: any, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {event.type === 'error' ? (
                      <Error color="error" />
                    ) : event.type === 'warning' ? (
                      <Warning color="warning" />
                    ) : (
                      <CheckCircle color="success" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={event.message}
                    secondary={new Date(event.timestamp).toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemPage;