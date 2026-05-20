import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Stack,
} from '@mui/material';
import { IconClipboardList, IconCheck, IconX, IconClock, IconFileText } from '@tabler/icons-react';
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

export default function AdminUpiDashboard() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['admin-upi-applications'],
    queryFn: () => api.get('/applications').then(r => r.data),
  });

  const apps = data?.applications || [];
  const stats = {
    total: apps.length,
    submitted: apps.filter(a => a.status === 'submitted').length,
    approved: apps.filter(a => ['approved', 'letter_generated'].includes(a.status)).length,
    signed: apps.filter(a => a.status === 'signed').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Dashboard Admin UPI</Typography>
        <Typography variant="body2" color="text.secondary">Kelola pengajuan magang mahasiswa</Typography>
      </Box>

      <Box sx={{ mb: 3 }}><PeriodCard /></Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<IconClipboardList size={28} />} label="Total Pengajuan" value={stats.total} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<IconClock size={28} />} label="Perlu Review" value={stats.submitted} color="warning.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<IconCheck size={28} />} label="Disetujui" value={stats.approved} color="success.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<IconFileText size={28} />} label="Ditandatangani" value={stats.signed} color="secondary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<IconX size={28} />} label="Ditolak" value={stats.rejected} color="error.main" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4">Antrian Validasi</Typography>
            <Button variant="contained" size="small" onClick={() => navigate('/admin-upi/applications')}>
              Lihat Semua
            </Button>
          </Stack>
          {stats.submitted === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              Tidak ada pengajuan yang perlu direview
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Mahasiswa</TableCell>
                    <TableCell>NIM</TableCell>
                    <TableCell>Perusahaan</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.filter(a => a.status === 'submitted').slice(0, 10).map(app => (
                    <TableRow key={app.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{app.student_name}</TableCell>
                      <TableCell>{app.nim}</TableCell>
                      <TableCell>{app.company_name}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => navigate(`/admin-upi/applications?id=${app.id}`)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}><InternshipFlowCard /></Box>
    </Box>
  );
}
