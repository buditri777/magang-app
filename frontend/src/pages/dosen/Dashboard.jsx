import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import { IconUsers, IconClipboardList, IconBriefcase, IconClock } from '@tabler/icons-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const statusMap = {
  submitted: { label: 'Diajukan', color: 'info' },
  under_review: { label: 'Ditinjau', color: 'warning' },
  rejected: { label: 'Ditolak', color: 'error' },
  approved: { label: 'Disetujui', color: 'success' },
  signed: { label: 'Ditandatangani', color: 'success' },
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

export default function DosenDashboard() {
  const { user } = useAuth();

  const { data: studentsData } = useQuery({
    queryKey: ['dosen-students'],
    queryFn: () => api.get('/dosen/students').then(r => r.data),
  });

  const { data: appsData } = useQuery({
    queryKey: ['dosen-applications'],
    queryFn: () => api.get('/dosen/applications').then(r => r.data),
  });

  const students = studentsData?.students || [];
  const apps = appsData?.applications || [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Halo, {user?.full_name} 👋</Typography>
        <Typography variant="body2" color="text.secondary">Dashboard pemantauan mahasiswa bimbingan</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconUsers size={28} />} label="Mahasiswa Bimbingan" value={students.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClipboardList size={28} />} label="Total Pengajuan" value={apps.length} color="secondary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconBriefcase size={28} />} label="Sedang Magang" value={apps.filter(a => a.status === 'signed').length} color="success.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClock size={28} />} label="Menunggu Review" value={apps.filter(a => a.status === 'submitted').length} color="warning.dark" />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>Mahasiswa Bimbingan</Typography>
          {students.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Belum ada mahasiswa bimbingan</Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>NIM</TableCell>
                    <TableCell>Nama</TableCell>
                    <TableCell>Program Studi</TableCell>
                    <TableCell>Angkatan</TableCell>
                    <TableCell>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.nim}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{s.full_name}</TableCell>
                      <TableCell>{s.program_studi}</TableCell>
                      <TableCell>{s.angkatan}</TableCell>
                      <TableCell>{s.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h4" sx={{ mb: 2 }}>Pengajuan Magang</Typography>
          {apps.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>Belum ada pengajuan</Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Mahasiswa</TableCell>
                    <TableCell>Perusahaan</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.map(app => {
                    const st = statusMap[app.status] || { label: app.status, color: 'default' };
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell>{app.student_name} ({app.nim})</TableCell>
                        <TableCell>{app.company_name} - {app.city}</TableCell>
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
