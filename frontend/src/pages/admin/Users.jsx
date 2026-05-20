import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, InputAdornment,
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import api from '../../lib/api';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => alert(`Password direset: ${res.data.temp_password}`),
  });

  const users = data?.users || [];

  const statusColor = (status) => {
    const map = { active: 'success', inactive: 'error', must_change_password: 'warning', pending_activation: 'info' };
    return map[status] || 'default';
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Manajemen User</Typography>
        <Typography variant="body2" color="text.secondary">Kelola akun pengguna sistem</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Cari nama/email..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> } }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Role</InputLabel>
          <Select value={filters.role} label="Role" onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}>
            <MenuItem value="">Semua</MenuItem>
            <MenuItem value="super_admin">Super Admin</MenuItem>
            <MenuItem value="admin_upi">Admin UPI</MenuItem>
            <MenuItem value="dosen">Dosen</MenuItem>
            <MenuItem value="mahasiswa">Mahasiswa</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
            <MenuItem value="">Semua</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="must_change_password">Must Change PW</MenuItem>
            <MenuItem value="pending_activation">Pending</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nama</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Dibuat</TableCell>
                    <TableCell>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Chip label={user.role} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={user.status} size="small" color={statusColor(user.status)} /></TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {user.status === 'active' ? (
                            <Button size="small" color="error" variant="outlined" onClick={() => updateMutation.mutate({ id: user.id, status: 'inactive' })}>
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button size="small" color="success" variant="outlined" onClick={() => updateMutation.mutate({ id: user.id, status: 'active' })}>
                              Aktifkan
                            </Button>
                          )}
                          <Button size="small" variant="outlined" onClick={() => resetMutation.mutate(user.id)}>
                            Reset PW
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Tidak ada user</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
