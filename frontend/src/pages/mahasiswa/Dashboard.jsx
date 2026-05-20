import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Stack,
} from '@mui/material';
import { IconClipboardList, IconClock, IconCheck, IconX, IconPlus } from '@tabler/icons-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const statusMap = {
  draft: { label: 'Draft', color: 'default' },
  submitted: { label: 'Diajukan', color: 'info' },
  under_review: { label: 'Ditinjau', color: 'warning' },
  rejected: { label: 'Ditolak', color: 'error' },
  approved: { label: 'Disetujui', color: 'success' },
  letter_generated: { label: 'Surat Dibuat', color: 'success' },
  signed: { label: 'Ditandatangani', color: 'success' },
  completed: { label: 'Selesai', color: 'success' },
};

const StatCard = ({ icon, label, value, color = 'primary.main' }) => (
  <Card sx={{ borderLeft: '4px solid', borderColor: color }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <Typography variant="h3">{value}</Typography>
      </Box>
    </CardContent>
  </Card>
);

export default function MahasiswaDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/my').then(r => r.data),
  });

  const apps = data?.applications || [];
  const stats = {
    total: apps.length,
    submitted: apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
    approved: apps.filter(a => ['approved', 'letter_generated', 'signed', 'completed'].includes(a.status)).length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Halo, {user?.full_name} 👋</Typography>
        <Typography variant="body2" color="text.secondary">Selamat datang di Sistem Manajemen Magang UDB</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClipboardList size={28} />} label="Total Pengajuan" value={stats.total} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClock size={28} />} label="Sedang Diproses" value={stats.submitted} color="warning.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconCheck size={28} />} label="Disetujui" value={stats.approved} color="success.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconX size={28} />} label="Ditolak" value={stats.rejected} color="error.main" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4">Pengajuan Terbaru</Typography>
            <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => navigate('/mahasiswa/apply')}>
              Ajukan Magang Baru
            </Button>
          </Stack>
          {apps.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography sx={{ mb: 2 }}>Belum ada pengajuan magang.</Typography>
              <Button variant="contained" onClick={() => navigate('/mahasiswa/apply')}>Ajukan Sekarang</Button>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Perusahaan</TableCell>
                    <TableCell>Posisi</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.slice(0, 5).map(app => {
                    const st = statusMap[app.status] || { label: app.status, color: 'default' };
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{app.company_name}</TableCell>
                        <TableCell>{app.position || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell><Chip label={st.label} size="small" color={st.color} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
