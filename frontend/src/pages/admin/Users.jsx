import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert,
} from '@mui/material';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import api from '../../lib/api';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [form, setForm] = useState({
    email: '', full_name: '', role: '', phone: '',
    nim: '', nidn: '', program_studi: '', fakultas: '', angkatan: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      enqueueSnackbar('User berhasil diupdate', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Gagal update user', { variant: 'error' }),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => {
      enqueueSnackbar(`Password direset: ${res.data.temp_password}`, { variant: 'info', autoHideDuration: 10000 });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Gagal reset password', { variant: 'error' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/users', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-users']);
      setTempPassword(res.data.temp_password);
      enqueueSnackbar('User berhasil dibuat', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(err.response?.data?.error || 'Gagal membuat user', { variant: 'error' }),
  });

  const users = data?.users || [];

  const statusColor = (status) => {
    const map = { active: 'success', inactive: 'error', must_change_password: 'warning', pending_activation: 'info' };
    return map[status] || 'default';
  };

  const handleOpenDialog = () => {
    setForm({ email: '', full_name: '', role: '', phone: '', nim: '', nidn: '', program_studi: '', fakultas: '', angkatan: '' });
    setTempPassword('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTempPassword('');
  };

  const handleSubmit = () => {
    if (!form.email || !form.full_name || !form.role) {
      enqueueSnackbar('Email, Nama Lengkap, dan Role wajib diisi', { variant: 'warning' });
      return;
    }
    const payload = { ...form };
    if (payload.angkatan) payload.angkatan = parseInt(payload.angkatan);
    // Remove empty optional fields
    Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
    createMutation.mutate(payload);
  };

  const handleFormChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h2">Manajemen User</Typography>
          <Typography variant="body2" color="text.secondary">Kelola akun pengguna sistem</Typography>
        </Box>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={handleOpenDialog}>
          Tambah User
        </Button>
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

      {/* Dialog Tambah User */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Tambah User Baru</DialogTitle>
        <DialogContent>
          {tempPassword && (
            <Alert severity="success" sx={{ mb: 2 }}>
              User berhasil dibuat! Password sementara: <strong>{tempPassword}</strong>
              <br />
              <Typography variant="caption">Salin password ini, tidak akan ditampilkan lagi.</Typography>
            </Alert>
          )}
          {!tempPassword && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Email" required fullWidth size="small"
                value={form.email} onChange={handleFormChange('email')}
              />
              <TextField
                label="Nama Lengkap" required fullWidth size="small"
                value={form.full_name} onChange={handleFormChange('full_name')}
              />
              <FormControl fullWidth size="small" required>
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={handleFormChange('role')}>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="admin_upi">Admin UPI</MenuItem>
                  <MenuItem value="dosen">Dosen</MenuItem>
                  <MenuItem value="mahasiswa">Mahasiswa</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Nomor HP" fullWidth size="small"
                value={form.phone} onChange={handleFormChange('phone')}
              />

              {form.role === 'mahasiswa' && (
                <>
                  <TextField
                    label="NIM" fullWidth size="small"
                    value={form.nim} onChange={handleFormChange('nim')}
                  />
                  <TextField
                    label="Program Studi" fullWidth size="small"
                    value={form.program_studi} onChange={handleFormChange('program_studi')}
                  />
                  <TextField
                    label="Fakultas" fullWidth size="small"
                    value={form.fakultas} onChange={handleFormChange('fakultas')}
                  />
                  <TextField
                    label="Angkatan" fullWidth size="small" type="number"
                    value={form.angkatan} onChange={handleFormChange('angkatan')}
                  />
                </>
              )}

              {form.role === 'dosen' && (
                <>
                  <TextField
                    label="NIDN" fullWidth size="small"
                    value={form.nidn} onChange={handleFormChange('nidn')}
                  />
                  <TextField
                    label="Program Studi" fullWidth size="small"
                    value={form.program_studi} onChange={handleFormChange('program_studi')}
                  />
                  <TextField
                    label="Fakultas" fullWidth size="small"
                    value={form.fakultas} onChange={handleFormChange('fakultas')}
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{tempPassword ? 'Tutup' : 'Batal'}</Button>
          {!tempPassword && (
            <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
