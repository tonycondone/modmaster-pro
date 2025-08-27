import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
  GridValueGetterParams
} from '@mui/x-data-grid';
import {
  Search,
  MoreVert,
  Edit,
  Block,
  CheckCircle,
  Email,
  PersonAdd,
  Download,
  FilterList
} from '@mui/icons-material';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import UserDetailsModal from '../components/UserDetailsModal';
import { useUsers } from '../hooks/useUsers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    status: 'all',
    subscription: 'all',
    dateRange: 'all'
  });

  const { data: users, isLoading, updateUser } = useUsers();

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, userId: string) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
    setSelectedUserId(null);
  };

  const handleUserAction = async (action: string) => {
    if (!selectedUserId) return;

    switch (action) {
      case 'edit':
        const user = users.find(u => u.id === selectedUserId);
        setSelectedUser(user);
        setDetailsOpen(true);
        break;
      case 'suspend':
        await updateUser(selectedUserId, { status: 'suspended' });
        break;
      case 'activate':
        await updateUser(selectedUserId, { status: 'active' });
        break;
      case 'verify':
        await updateUser(selectedUserId, { isVerified: true });
        break;
    }
    handleActionClose();
  };

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'User',
      width: 300,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={params.row.profilePicture}>
            {params.row.firstName?.[0]}{params.row.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{params.row.username} • {params.row.email}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'subscription',
      headerName: 'Subscription',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'pro' ? 'primary' :
            params.value === 'basic' ? 'secondary' :
            'default'
          }
          variant={params.value === 'enterprise' ? 'filled' : 'outlined'}
        />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {params.row.isVerified && (
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          )}
          <Chip
            label={params.value}
            size="small"
            color={
              params.value === 'active' ? 'success' :
              params.value === 'suspended' ? 'error' :
              'default'
            }
          />
        </Box>
      )
    },
    {
      field: 'vehicles',
      headerName: 'Vehicles',
      width: 100,
      type: 'number',
      valueGetter: (params: GridValueGetterParams) => params.row.stats?.totalVehicles || 0
    },
    {
      field: 'scans',
      headerName: 'Scans',
      width: 100,
      type: 'number',
      valueGetter: (params: GridValueGetterParams) => params.row.stats?.totalScans || 0
    },
    {
      field: 'projects',
      headerName: 'Projects',
      width: 100,
      type: 'number',
      valueGetter: (params: GridValueGetterParams) => params.row.stats?.totalProjects || 0
    },
    {
      field: 'lastLogin',
      headerName: 'Last Active',
      width: 150,
      valueGetter: (params: GridValueGetterParams) => 
        params.row.lastLogin ? format(new Date(params.row.lastLogin), 'MMM d, yyyy') : 'Never'
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      width: 150,
      valueGetter: (params: GridValueGetterParams) => 
        format(new Date(params.row.createdAt), 'MMM d, yyyy')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          onClick={(e) => handleActionClick(e, params.row.id)}
        >
          <MoreVert />
        </IconButton>
      )
    }
  ];

  const filteredUsers = users?.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        user.email.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'verified' && !user.isVerified) return false;
      if (filters.status === 'unverified' && user.isVerified) return false;
      if (filters.status === 'active' && user.status !== 'active') return false;
      if (filters.status === 'suspended' && user.status !== 'suspended') return false;
    }

    // Subscription filter
    if (filters.subscription !== 'all' && user.subscriptionTier !== filters.subscription) {
      return false;
    }

    return true;
  }) || [];

  const stats = {
    total: users?.length || 0,
    active: users?.filter(u => u.status === 'active').length || 0,
    verified: users?.filter(u => u.isVerified).length || 0,
    pro: users?.filter(u => u.subscriptionTier === 'pro' || u.subscriptionTier === 'enterprise').length || 0
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold">
            User Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {/* Export users */}}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => {/* Add user */}}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total Users</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">{stats.active}</Typography>
              <Typography variant="body2" color="text.secondary">Active Users</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.verified}</Typography>
              <Typography variant="body2" color="text.secondary">Verified Users</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight="bold" color="secondary.main">{stats.pro}</Typography>
              <Typography variant="body2" color="text.secondary">Pro/Enterprise</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label={`All Users (${stats.total})`} />
              <Tab label={`Active (${stats.active})`} />
              <Tab label={`Suspended (${stats.total - stats.active})`} />
            </Tabs>
          </Box>
          
          <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, maxWidth: 400 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="unverified">Unverified</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Subscription</InputLabel>
              <Select
                value={filters.subscription}
                label="Subscription"
                onChange={(e) => setFilters({ ...filters, subscription: e.target.value })}
              >
                <MenuItem value="all">All Tiers</MenuItem>
                <MenuItem value="free">Free</MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="pro">Pro</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Data Grid */}
        <Paper sx={{ height: 600 }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            loading={isLoading}
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection
            disableRowSelectionOnClick
            slots={{
              toolbar: GridToolbar,
            }}
            sx={{
              '& .MuiDataGrid-toolbarContainer': {
                p: 2,
                borderBottom: 1,
                borderColor: 'divider'
              }
            }}
          />
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={actionMenuAnchor}
          open={Boolean(actionMenuAnchor)}
          onClose={handleActionClose}
        >
          <MenuItem onClick={() => handleUserAction('edit')}>
            <Edit sx={{ mr: 1, fontSize: 20 }} /> Edit User
          </MenuItem>
          <MenuItem onClick={() => handleUserAction('verify')}>
            <CheckCircle sx={{ mr: 1, fontSize: 20 }} /> Verify Email
          </MenuItem>
          <MenuItem onClick={() => handleUserAction('suspend')}>
            <Block sx={{ mr: 1, fontSize: 20 }} /> Suspend User
          </MenuItem>
          <MenuItem onClick={() => handleUserAction('activate')}>
            <CheckCircle sx={{ mr: 1, fontSize: 20 }} /> Activate User
          </MenuItem>
        </Menu>

        {/* User Details Modal */}
        {selectedUser && (
          <UserDetailsModal
            open={detailsOpen}
            onClose={() => {
              setDetailsOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onUpdate={(updates) => updateUser(selectedUser.id, updates)}
          />
        )}
      </Box>
    </Layout>
  );
}