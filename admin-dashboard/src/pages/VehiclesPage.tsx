import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Avatar,
  Button,
} from '@mui/material';
import {
  Search,
  DirectionsCar,
  MoreVert,
  Download,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../services/api';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  maintenanceCount: number;
  scanCount: number;
  lastMaintenance: string | null;
  createdAt: string;
}

const VehiclesPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, rowsPerPage, search],
    queryFn: async () => {
      const response = await api.get('/admin/vehicles', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
        },
      });
      return response.data;
    },
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Vehicles</Typography>
        <Button
          variant="outlined"
          startIcon={<Download />}
        >
          Export
        </Button>
      </Box>

      <Paper>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Search by make, model, VIN, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vehicle</TableCell>
                <TableCell>VIN</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Maintenance</TableCell>
                <TableCell>Scans</TableCell>
                <TableCell>Last Service</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.vehicles.map((vehicle: Vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <DirectionsCar />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {vehicle.vin}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{vehicle.owner.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {vehicle.owner.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={`${vehicle.maintenanceCount} records`} size="small" />
                  </TableCell>
                  <TableCell>{vehicle.scanCount}</TableCell>
                  <TableCell>
                    {vehicle.lastMaintenance
                      ? format(new Date(vehicle.lastMaintenance), 'MMM dd, yyyy')
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vehicle.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data?.total || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default VehiclesPage;