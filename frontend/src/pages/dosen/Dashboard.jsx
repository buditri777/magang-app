import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Stack, Avatar,
} from '@mui/material';
import { IconUsers, IconClipboard, IconCircleCheck, IconClock } from '@tabler/icons-react';
import api from '../../lib/api';
import { PeriodCard, InternshipFlowCard } from '../../components/shared/SettingsCards';

const statusColor = (s) => {
  const map = { draft: 'default', submitted: 'info', under_review: 'warning', approved: 'success', rejected: 'error', letter_generated: 'primary', signed: 'secondary', completed: 'success' };
  return map[s] || 'default';
};

const statusLabel = (s) => {
  const map = { draft: 'Draft', submitted: 'Diajukan', under_review: 'Direview', approved: 'Disetujui', rejected: 'Ditolak', letter_generated: 'Surat Terbit', signed: 'Ditandatangani', completed: 'Selesai' };
  return map[s] || s;
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
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['dosen-students'],
    queryFn: () => api.get('/dosen/students').then(r => r.data),
  });

  const { data: appsData, isLoading: loadingApps } = useQuery({
    queryKey: ['dosen-applications'],
    queryFn: () => api.get('/dosen/applications').then(r => r.data),
  });

  const students = studentsData?.students || [];
  const applications = appsData?.applications || [];

  const stats = {
    students: students.length,
    pending: applications.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
    active: applications.filter(a => ['approved', 'letter_generated', 'signed'].includes(a.status)).length,
    completed: applications.filter(a => a.status === 'completed').length,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Dashboard Dosen Pembimbing</Typography>
        <Typography variant="body2" color="text.secondary">Kelola dan pantau magang mahasiswa bimbingan</Typography>
      </Box>

      <Box sx={{ mb: 3 }}><PeriodCard /></Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconUsers size={28} />} label="Mahasiswa Bimbingan" value={stats.students} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClock size={28} />} label="Menunggu Review" value={stats.pending} color="warning.dark" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconClipboard size={28} />} label="Sedang Magang" value={stats.active} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard icon={<IconCircleCheck size={28} />} label="Selesai" value={stats.completed} color="success.dark" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Mahasiswa Bimbingan</Typography>
              {loadingStudents ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>
              ) : students.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  Belum ada mahasiswa bimbingan ditugaskan
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {students.map(s => (
                    <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>{s.full_name?.charAt(0) || '?'}</Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={500} noWrap>{s.full_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.nim} · {s.program_studi || '—'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Status Magang Mahasiswa</Typography>
              {loadingApps ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mahasiswa</TableCell>
                        <TableCell>Perusahaan</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {applications.map(a => (
                        <TableRow key={a.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{a.student_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{a.nim}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{a.company_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.position || '-'}</Typography>
                          </TableCell>
                          <TableCell><Chip label={statusLabel(a.status)} color={statusColor(a.status)} size="small" /></TableCell>
                        </TableRow>
                      ))}
                      {applications.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            Belum ada pengajuan magang dari mahasiswa bimbingan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}><InternshipFlowCard /></Box>
    </Box>
  );
}
