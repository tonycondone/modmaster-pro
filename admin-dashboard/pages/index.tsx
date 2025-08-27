import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  DirectionsCar,
  CameraAlt,
  AttachMoney,
  Build,
  ShoppingCart,
  Refresh,
  DateRange
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard';
import { useAnalytics } from '../hooks/useAnalytics';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const theme = useTheme();
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [refreshing, setRefreshing] = useState(false);

  const { data: analytics, isLoading, refetch } = useAnalytics(dateRange);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const metrics = [
    {
      title: 'Total Users',
      value: analytics?.users.total || 0,
      change: analytics?.users.changePercent || 0,
      icon: People,
      color: theme.palette.primary.main
    },
    {
      title: 'Active Vehicles',
      value: analytics?.vehicles.total || 0,
      change: analytics?.vehicles.changePercent || 0,
      icon: DirectionsCar,
      color: theme.palette.secondary.main
    },
    {
      title: 'Scans Completed',
      value: analytics?.scans.total || 0,
      change: analytics?.scans.changePercent || 0,
      icon: CameraAlt,
      color: theme.palette.success.main
    },
    {
      title: 'Revenue',
      value: `$${(analytics?.revenue.total || 0).toLocaleString()}`,
      change: analytics?.revenue.changePercent || 0,
      icon: AttachMoney,
      color: theme.palette.warning.main
    },
    {
      title: 'Active Projects',
      value: analytics?.projects.active || 0,
      change: analytics?.projects.changePercent || 0,
      icon: Build,
      color: theme.palette.info.main
    },
    {
      title: 'Parts Sold',
      value: analytics?.marketplace.partsSold || 0,
      change: analytics?.marketplace.changePercent || 0,
      icon: ShoppingCart,
      color: theme.palette.error.main
    }
  ];

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold">
            Dashboard Overview
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(newValue) => setDateRange({ ...dateRange, start: newValue || new Date() })}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange({ ...dateRange, end: newValue || new Date() })}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh className={refreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Box>
        </Box>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Metrics Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
              <MetricCard {...metric} />
            </Grid>
          ))}
        </Grid>

        {/* Charts Row 1 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                User Growth & Activity
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={analytics?.charts.userActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="newUsers" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="returningUsers" stackId="1" stroke="#ffc658" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Subscription Distribution
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={analytics?.charts.subscriptionTiers || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(analytics?.charts.subscriptionTiers || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Row 2 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Scan Activity by Type
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={analytics?.charts.scansByType || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                  <Bar dataKey="successRate" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Revenue Trends
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={analytics?.charts.revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="subscriptions" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="marketplace" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" stroke="#ff7300" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Top Lists */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Vehicle Makes
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics?.topLists.vehicleMakes.map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{item.name}</Typography>
                      <Typography variant="body2" fontWeight="bold">{item.count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / analytics.topLists.vehicleMakes[0].count) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Popular Parts
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics?.topLists.popularParts.map((part, index) => (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 2,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  }}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {part.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {part.category}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${part.searches} searches`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Active Regions
              </Typography>
              <Box sx={{ mt: 2 }}>
                {analytics?.topLists.activeRegions.map((region, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{region.name}</Typography>
                        {region.growth > 0 ? (
                          <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                        ) : (
                          <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {region.users.toLocaleString()} users
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
}