import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  People,
  DirectionsCar,
  Build,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  MoreVert,
  CameraAlt,
  AttachMoney,
} from '@mui/icons-material';
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
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface DashboardStats {
  users: { total: number; new: number; growth: number };
  vehicles: { total: number; active: number; growth: number };
  parts: { total: number; inStock: number; lowStock: number };
  orders: { total: number; pending: number; revenue: number };
  scans: { total: number; today: number; accuracy: number };
}

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/stats');
      return response.data;
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ['revenueChart'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/revenue');
      return response.data;
    },
  });

  const { data: userActivityData } = useQuery({
    queryKey: ['userActivity'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/user-activity');
      return response.data;
    },
  });

  const { data: popularPartsData } = useQuery({
    queryKey: ['popularParts'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard/popular-parts');
      return response.data;
    },
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      change: stats?.users.growth || 0,
      icon: <People />,
      color: '#1976d2',
      subtitle: `${stats?.users.new || 0} new this month`,
    },
    {
      title: 'Active Vehicles',
      value: stats?.vehicles.total || 0,
      change: stats?.vehicles.growth || 0,
      icon: <DirectionsCar />,
      color: '#388e3c',
      subtitle: `${stats?.vehicles.active || 0} with recent activity`,
    },
    {
      title: 'Parts Listed',
      value: stats?.parts.total || 0,
      change: 0,
      icon: <Build />,
      color: '#f57c00',
      subtitle: `${stats?.parts.lowStock || 0} low stock`,
    },
    {
      title: 'Total Orders',
      value: stats?.orders.total || 0,
      change: 15,
      icon: <ShoppingCart />,
      color: '#d32f2f',
      subtitle: `${stats?.orders.pending || 0} pending`,
    },
    {
      title: 'AI Scans',
      value: stats?.scans.total || 0,
      change: 25,
      icon: <CameraAlt />,
      color: '#7b1fa2',
      subtitle: `${stats?.scans.accuracy || 0}% accuracy`,
    },
    {
      title: 'Revenue',
      value: `$${(stats?.orders.revenue || 0).toLocaleString()}`,
      change: 18,
      icon: <AttachMoney />,
      color: '#00796b',
      subtitle: 'This month',
    },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={stat.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography color="textSecondary" variant="caption">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {stat.subtitle}
                </Typography>
                {stat.change !== 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {stat.change > 0 ? (
                      <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                    ) : (
                      <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                    )}
                    <Typography
                      variant="caption"
                      color={stat.change > 0 ? 'success.main' : 'error.main'}
                    >
                      {Math.abs(stat.change)}%
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* User Activity */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              User Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userActivityData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(userActivityData || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Popular Parts */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Popular Parts
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={popularPartsData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Recent Activity
            </Typography>
            <Box>
              {[
                { type: 'order', message: 'New order #12345 placed', time: '5 min ago' },
                { type: 'user', message: 'New user registration', time: '15 min ago' },
                { type: 'scan', message: 'AI scan completed', time: '1 hour ago' },
                { type: 'part', message: 'Low stock alert: Brake Pads', time: '2 hours ago' },
              ].map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: index < 3 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Chip
                    label={activity.type}
                    size="small"
                    color={
                      activity.type === 'order'
                        ? 'success'
                        : activity.type === 'user'
                        ? 'primary'
                        : activity.type === 'scan'
                        ? 'info'
                        : 'warning'
                    }
                    sx={{ mr: 2 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{activity.message}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;