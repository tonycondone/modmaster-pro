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
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search,
  Build,
  Add,
  FilterList,
  Download,
  Inventory,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const PartsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['partsStats'],
    queryFn: async () => {
      const response = await api.get('/admin/parts/stats');
      return response.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['parts', page, rowsPerPage, search],
    queryFn: async () => {
      const response = await api.get('/admin/parts', {
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

  const getStockColor = (quantity: number) => {
    if (quantity === 0) return 'error';
    if (quantity < 10) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Parts Inventory</Typography>
        <Box>
          <Button variant="outlined" startIcon={<Download />} sx={{ mr: 2 }}>
            Export
          </Button>
          <Button variant="contained" startIcon={<Add />}>
            Add Part
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Inventory sx={{ color: 'primary.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Parts
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.total || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  In Stock
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.inStock || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ color: 'warning.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Low Stock
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.lowStock || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Build sx={{ color: 'info.main', mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Categories
                </Typography>
              </Box>
              <Typography variant="h4">{stats?.categories || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="Search parts by name, SKU, or category..."
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
                <TableCell>Part</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Sold</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.parts.map((part: any) => (
                <TableRow key={part.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <img
                        src={part.image || '/placeholder.png'}
                        alt={part.name}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {part.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {part.brand}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {part.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>{part.category}</TableCell>
                  <TableCell>${part.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={part.stock}
                      size="small"
                      color={getStockColor(part.stock)}
                    />
                  </TableCell>
                  <TableCell>{part.sold}</TableCell>
                  <TableCell>
                    {part.rating ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">{part.rating.toFixed(1)}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>
                          ({part.reviewCount})
                        </Typography>
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small">
                      <Build />
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

export default PartsPage;