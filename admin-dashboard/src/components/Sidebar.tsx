import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  People,
  DirectionsCar,
  Build,
  ShoppingCart,
  CameraAlt,
  Analytics,
  Computer,
  Settings,
} from '@mui/icons-material';

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Users', icon: <People />, path: '/users' },
  { text: 'Vehicles', icon: <DirectionsCar />, path: '/vehicles' },
  { text: 'Parts', icon: <Build />, path: '/parts' },
  { text: 'Orders', icon: <ShoppingCart />, path: '/orders' },
  { text: 'Scans', icon: <CameraAlt />, path: '/scans' },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  { text: 'System', icon: <Computer />, path: '/system' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <List>
      {menuItems.map((item, index) => (
        <React.Fragment key={item.text}>
          {index === 7 && <Divider sx={{ my: 1 }} />}
          <ListItem disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
};

export default Sidebar;