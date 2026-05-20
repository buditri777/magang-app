import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Stack,
} from '@mui/material';
import { IconUsers, IconUserCheck, IconSchool, IconShieldCheck, IconAlertCircle } from '@tabler/icons-react';
import api from '../../lib/api';
import { PeriodCard, InternshipFlowCard } from '../../components/shared/SettingsCards';

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

export default function AdminDashboard() {
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get('/admin/import-jobs').then(r => r.data),
  });

  const users = usersData?.users || [];
  const stats = {
    total: users.length,
    mahasiswa: users.filter(u => u.role === 'mahasiswa').length,
    dosen: users.filter(u => u.role === 'dosen').length,
    admin_upi: users.filter(u => u.role === 'admin_upi').length,
    pending: users.filter(u => u.status === 'pending_activation' || u.status === 'must_change_password').length,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Dashboard Super Admin</Typography>
        <Typography variant="body2" color="text.secondary">Ringkasan sistem manajemen magang</Typography>
      </Box>

      <Box sx={{ mb: 3 }}><PeriodCard /></Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard icon={<IconUsers size={28} />} label="Total User" value={stats.total} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard icon={<IconSchool size={28} />} label="Mahasiswa" value={stats.mahasiswa} color="secondary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard icon={<IconUserCheck size={28} />} label="Dosen" value={stats.dosen} color="success.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard icon={<IconShieldCheck size={28} />} label="Admin UPI" value={stats.admin_upi} color="warning.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard icon={<IconAlertCircle size={28} />} label="Pending" value={stats.pending} color="error.main" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>Riwayat Import Terakhir</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell>Tipe</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Sukses</TableCell>
                  <TableCell align="center">Gagal</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(jobsData?.jobs || []).slice(0, 10).map(job => (
                  <TableRow key={job.id} hover>
                    <TableCell>{new Date(job.created_at).toLocaleString('id-ID')}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{job.type}</TableCell>
                    <TableCell>{job.file_name}</TableCell>
                    <TableCell align="center">{job.total_rows}</TableCell>
                    <TableCell align="center"><Chip label={job.success_rows} size="small" color="success" /></TableCell>
                    <TableCell align="center">
                      {job.failed_rows > 0 ? <Chip label={job.failed_rows} size="small" color="error" /> : '-'}
                    </TableCell>
                    <TableCell><Chip label={job.status} size="small" color="info" /></TableCell>
                  </TableRow>
                ))}
                {(!jobsData?.jobs || jobsData.jobs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Belum ada riwayat import
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}><InternshipFlowCard /></Box>
    </Box>
  );
}
