import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  CameraAlt,
  CheckCircle,
  Error,
  TrendingUp,
  Speed,
  Visibility,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../services/api';

const ScansPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['scanStats'],
    queryFn: async () => {
      const response = await api.get('/admin/scans/stats');
      return response.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['scans', page, rowsPerPage],
    queryFn: async () => {
      const response = await api.get('/admin/scans', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      return response.data;
    },
  });

  const handleViewDetails = (scan: any) => {
    setSelectedScan(scan);
    setDetailsOpen(true);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        AI Scans
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CameraAlt sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Scans
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.total || 0}</Typography>
              <Typography variant="caption" color="textSecondary">
                +{stats?.todayCount || 0} today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Success Rate
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.successRate || 0}%</Typography>
              <Typography variant="caption" color="textSecondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: 'info.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Avg Accuracy
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.avgAccuracy || 0}%</Typography>
              <Typography variant="caption" color="textSecondary">
                Based on feedback
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Speed sx={{ color: 'warning.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Avg Time
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.avgTime || 0}s</Typography>
              <Typography variant="caption" color="textSecondary">
                Per scan
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Scan ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Parts Found</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.scans.map((scan: any) => (
                <TableRow key={scan.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      #{scan.id.substring(0, 8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{scan.user.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {scan.user.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {scan.vehicle ? (
                      <Typography variant="body2">
                        {scan.vehicle.year} {scan.vehicle.make} {scan.vehicle.model}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{scan.partsCount}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {Math.round(scan.confidence * 100)}%
                      </Typography>
                      <Box
                        sx={{
                          width: 50,
                          height: 4,
                          bgcolor: 'grey.300',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${scan.confidence * 100}%`,
                            height: '100%',
                            bgcolor:
                              scan.confidence > 0.8
                                ? 'success.main'
                                : scan.confidence > 0.6
                                ? 'warning.main'
                                : 'error.main',
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={scan.status === 'completed' ? <CheckCircle /> : <Error />}
                      label={scan.status}
                      size="small"
                      color={scan.status === 'completed' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(scan.createdAt), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleViewDetails(scan)}>
                      <Visibility />
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
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Scan Details</DialogTitle>
        <DialogContent>
          {selectedScan && (
            <Box>
              <img
                src={selectedScan.imageUrl}
                alt="Scan"
                style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }}
              />
              {/* Additional scan details would go here */}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ScansPage;