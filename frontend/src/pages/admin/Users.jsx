import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, IconButton, Tooltip,
} from '@mui/material';
import { IconSearch, IconPlus, IconRefresh, IconCopy } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

function CreateUserDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', full_name: '', role: 'mahasiswa', phone: '', nim: '', nidn: '', program_studi: '', fakultas: '', angkatan: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/admin/users', data),
    onSuccess: (res) => {
      setResult(res.data);
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (err) => setError(err.response?.data?.error || 'Gagal membuat user'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const payload = { email: form.email, full_name: form.full_name, role: form.role, phone: form.phone || undefined };
    if (form.role === 'mahasiswa') {
      payload.nim = form.nim;
      payload.program_studi = form.program_studi;
      payload.fakultas = form.fakultas;
      payload.angkatan = form.angkatan;
    } else if (form.role === 'dosen') {
      payload.nidn = form.nidn;
      payload.program_studi = form.program_studi;
      payload.fakultas = form.fakultas;
    }
    mutation.mutate(payload);
  };

  const handleClose = () => {
    setForm({ email: '', full_name: '', role: 'mahasiswa', phone: '', nim: '', nidn: '', program_studi: '', fakultas: '', angkatan: '' });
    setResult(null);
    setError('');
    onClose();
  };

  const copyPassword = () => {
    if (result?.temp_password) {
      navigator.clipboard.writeText(result.temp_password);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tambah User Baru</DialogTitle>
      <DialogContent>
        {result ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            <Typography variant="subtitle2">User berhasil dibuat!</Typography>
            <Typography variant="body2">Email: <strong>{result.user.email}</strong></Typography>
            <Typography variant="body2">Role: <strong>{result.user.role}</strong></Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
              <Typography variant="body2">Password sementara:</Typography>
              <Chip label={result.temp_password} color="warning" size="small" />
              <Tooltip title="Copy password">
                <IconButton size="small" onClick={copyPassword}><IconCopy size={16} /></IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Berikan password ini ke user. Mereka wajib ganti saat login pertama.
            </Typography>
          </Alert>
        ) : (
          <form id="create-user-form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Nama Lengkap" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required fullWidth />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required fullWidth placeholder="user@udb.ac.id" />
              <TextField label="No. HP" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} fullWidth placeholder="08xxxxxxxxxx" />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                  <MenuItem value="mahasiswa">Mahasiswa</MenuItem>
                  <MenuItem value="dosen">Dosen</MenuItem>
                  <MenuItem value="admin_upi">Admin UPI</MenuItem>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                </Select>
              </FormControl>

              {form.role === 'mahasiswa' && (
                <>
                  <TextField label="NIM" value={form.nim} onChange={(e) => setForm(f => ({ ...f, nim: e.target.value }))} required fullWidth />
                  <TextField label="Program Studi" value={form.program_studi} onChange={(e) => setForm(f => ({ ...f, program_studi: e.target.value }))} fullWidth />
                  <TextField label="Fakultas" value={form.fakultas} onChange={(e) => setForm(f => ({ ...f, fakultas: e.target.value }))} fullWidth />
                  <TextField label="Angkatan" type="number" value={form.angkatan} onChange={(e) => setForm(f => ({ ...f, angkatan: e.target.value }))} fullWidth placeholder="2021" />
                </>
              )}

              {form.role === 'dosen' && (
                <>
                  <TextField label="NIDN" value={form.nidn} onChange={(e) => setForm(f => ({ ...f, nidn: e.target.value }))} required fullWidth />
                  <TextField label="Program Studi" value={form.program_studi} onChange={(e) => setForm(f => ({ ...f, program_studi: e.target.value }))} fullWidth />
                  <TextField label="Fakultas" value={form.fakultas} onChange={(e) => setForm(f => ({ ...f, fakultas: e.target.value }))} fullWidth />
                </>
              )}
            </Stack>
          </form>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>{result ? 'Tutup' : 'Batal'}</Button>
        {!result && (
          <Button type="submit" form="create-user-form" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Buat User'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      enqueueSnackbar('Status user berhasil diupdate', { variant: 'success' });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.error || 'Gagal update', { variant: 'error' }),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => {
      enqueueSnackbar(`Password direset: ${res.data.temp_password} (sudah dikirim ke email user)`, {
        variant: 'success',
        autoHideDuration: 8000,
      });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.error || 'Gagal reset password', { variant: 'error' }),
  });

  const users = data?.users || [];

  const statusColor = (status) => {
    const map = { active: 'success', inactive: 'error', must_change_password: 'warning', pending_activation: 'info' };
    return map[status] || 'default';
  };

  const roleLabel = (role) => {
    const map = { super_admin: 'Super Admin', admin_upi: 'Admin UPI', dosen: 'Dosen', mahasiswa: 'Mahasiswa' };
    return map[role] || role;
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h2">Manajemen User</Typography>
          <Typography variant="body2" color="text.secondary">Kelola akun pengguna sistem ({users.length} user)</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={() => setCreateOpen(true)}
          sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          Tambah User
        </Button>
      </Stack>

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
                      <TableCell><Chip label={roleLabel(user.role)} size="small" variant="outlined" /></TableCell>
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
                          <Tooltip title="Reset password user">
                            <IconButton size="small" color="warning" onClick={() => resetMutation.mutate(user.id)}>
                              <IconRefresh size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Tidak ada user ditemukan</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
