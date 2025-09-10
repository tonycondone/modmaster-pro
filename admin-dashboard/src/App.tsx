import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import VehiclesPage from './pages/VehiclesPage';
import PartsPage from './pages/PartsPage';
import OrdersPage from './pages/OrdersPage';
import ScansPage from './pages/ScansPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SystemPage from './pages/SystemPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="parts" element={<PartsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="scans" element={<ScansPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Box>
    </AuthProvider>
  );
}

export default App;