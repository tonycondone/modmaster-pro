import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put('/admin/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccessMessage('Settings updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveGeneral = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    updateSettingsMutation.mutate({
      general: Object.fromEntries(formData),
    });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Settings
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="General" />
          <Tab label="Security" />
          <Tab label="Notifications" />
          <Tab label="API" />
          <Tab label="Maintenance" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSaveGeneral}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              General Settings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Site Name"
                name="siteName"
                defaultValue={settings?.general?.siteName || 'ModMaster Pro'}
                fullWidth
              />
              <TextField
                label="Admin Email"
                name="adminEmail"
                type="email"
                defaultValue={settings?.general?.adminEmail || ''}
                fullWidth
              />
              <TextField
                label="Support Email"
                name="supportEmail"
                type="email"
                defaultValue={settings?.general?.supportEmail || ''}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    name="maintenanceMode"
                    defaultChecked={settings?.general?.maintenanceMode || false}
                  />
                }
                label="Maintenance Mode"
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              sx={{ mt: 3 }}
              disabled={updateSettingsMutation.isPending}
            >
              Save Changes
            </Button>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Security Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch defaultChecked={settings?.security?.twoFactorAuth || false} />}
              label="Require Two-Factor Authentication for Admins"
            />
            <FormControlLabel
              control={<Switch defaultChecked={settings?.security?.sessionTimeout || false} />}
              label="Auto Logout After Inactivity"
            />
            <TextField
              label="Session Timeout (minutes)"
              type="number"
              defaultValue={settings?.security?.sessionTimeoutMinutes || 30}
              fullWidth
            />
            <TextField
              label="Max Login Attempts"
              type="number"
              defaultValue={settings?.security?.maxLoginAttempts || 5}
              fullWidth
            />
          </Box>
          <Button variant="contained" startIcon={<Save />} sx={{ mt: 3 }}>
            Save Security Settings
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Notification Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch defaultChecked={settings?.notifications?.emailEnabled || true} />}
              label="Email Notifications"
            />
            <FormControlLabel
              control={<Switch defaultChecked={settings?.notifications?.newUserAlert || true} />}
              label="New User Registration Alerts"
            />
            <FormControlLabel
              control={<Switch defaultChecked={settings?.notifications?.orderAlert || true} />}
              label="New Order Alerts"
            />
            <FormControlLabel
              control={<Switch defaultChecked={settings?.notifications?.lowStockAlert || true} />}
              label="Low Stock Alerts"
            />
            <TextField
              label="Low Stock Threshold"
              type="number"
              defaultValue={settings?.notifications?.lowStockThreshold || 10}
              fullWidth
            />
          </Box>
          <Button variant="contained" startIcon={<Save />} sx={{ mt: 3 }}>
            Save Notification Settings
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            API Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="API Rate Limit (requests per minute)"
              type="number"
              defaultValue={settings?.api?.rateLimit || 100}
              fullWidth
            />
            <FormControlLabel
              control={<Switch defaultChecked={settings?.api?.requireApiKey || true} />}
              label="Require API Key for External Access"
            />
            <TextField
              label="CORS Allowed Origins"
              multiline
              rows={3}
              defaultValue={settings?.api?.corsOrigins?.join('\n') || ''}
              fullWidth
              helperText="One origin per line"
            />
          </Box>
          <Button variant="contained" startIcon={<Save />} sx={{ mt: 3 }}>
            Save API Settings
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Maintenance
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Database Backup
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Last backup: {settings?.maintenance?.lastBackup || 'Never'}
              </Typography>
              <Button variant="outlined">Run Backup Now</Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Clear Cache
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Clear all cached data to free up space
              </Typography>
              <Button variant="outlined" color="warning">
                Clear Cache
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                System Logs
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Download system logs for debugging
              </Typography>
              <Button variant="outlined">Download Logs</Button>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default SettingsPage;