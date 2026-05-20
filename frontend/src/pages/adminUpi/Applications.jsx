import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, IconButton, Tooltip, Grid,
} from '@mui/material';
import { IconSearch, IconEye, IconCheck, IconX, IconFileDownload } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

const statusColor = (s) => {
  const map = { draft: 'default', submitted: 'info', under_review: 'warning', approved: 'success', rejected: 'error', letter_generated: 'primary', signed: 'secondary', completed: 'success' };
  return map[s] || 'default';
};

const statusLabel = (s) => {
  const map = { draft: 'Draft', submitted: 'Diajukan', under_review: 'Direview', approved: 'Disetujui', rejected: 'Ditolak', letter_generated: 'Surat Terbit', signed: 'Ditandatangani', completed: 'Selesai' };
  return map[s] || s;
};

function ReviewDialog({ open, onClose, application }) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [rejectionReason, setRejectionReason] = useState('');
  const [letterNumber, setLetterNumber] = useState('');

  const reviewMutation = useMutation({
    mutationFn: (body) => api.patch(`/applications/${application?.id}/review`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['upi-applications']);
      enqueueSnackbar(vars.action === 'approve' ? 'Pengajuan disetujui' : 'Pengajuan ditolak', {
        variant: vars.action === 'approve' ? 'success' : 'warning',
      });
      onClose();
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.error || 'Gagal review', { variant: 'error' }),
  });

  if (!application) return null;

  const handleApprove = () => {
    reviewMutation.mutate({ action: 'approve', letter_number: letterNumber || undefined });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      enqueueSnackbar('Alasan penolakan wajib diisi', { variant: 'warning' });
      return;
    }
    reviewMutation.mutate({ action: 'reject', rejection_reason: rejectionReason });
  };

  const handleDownloadLetter = () => {
    window.open(`/api/applications/${application.id}/generate-letter`, '_blank');
  };

  const canReview = ['submitted', 'under_review'].includes(application.status);
  const canDownload = ['approved', 'letter_generated', 'signed', 'completed'].includes(application.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detail Pengajuan Magang</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Mahasiswa</Typography>
            <Typography variant="body1" fontWeight={500}>{application.student_name}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">NIM</Typography>
            <Typography variant="body1">{application.nim || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Perusahaan</Typography>
            <Typography variant="body1" fontWeight={500}>{application.company_name}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Posisi / Divisi</Typography>
            <Typography variant="body1">{application.position || '-'} / {application.division || '-'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Periode</Typography>
            <Typography variant="body1">
              {new Date(application.start_date).toLocaleDateString('id-ID')} — {new Date(application.end_date).toLocaleDateString('id-ID')}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Box><Chip label={statusLabel(application.status)} color={statusColor(application.status)} size="small" /></Box>
          </Grid>
          {application.notes && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">Catatan Mahasiswa</Typography>
              <Typography variant="body2">{application.notes}</Typography>
            </Grid>
          )}
          {application.rejection_reason && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error" sx={{ mt: 1 }}>
                <strong>Alasan ditolak:</strong> {application.rejection_reason}
              </Alert>
            </Grid>
          )}
        </Grid>

        {canReview && (
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Review Pengajuan</Typography>
            <Stack spacing={2}>
              <TextField
                label="Nomor Surat (opsional, diisi saat approve)"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                fullWidth
                size="small"
                placeholder="001/UDB/FIKOM/V/2026"
              />
              <TextField
                label="Alasan Penolakan (wajib jika reject)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Jelaskan alasan penolakan..."
              />
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {canDownload && (
          <Button startIcon={<IconFileDownload size={18} />} onClick={handleDownloadLetter} color="primary">
            Download Surat
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Tutup</Button>
        {canReview && (
          <>
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconX size={18} />}
              onClick={handleReject}
              disabled={reviewMutation.isPending}
            >
              Tolak
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<IconCheck size={18} />}
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
            >
              Setujui
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function AdminUpiApplications() {
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['upi-applications', filters],
    queryFn: () => api.get('/applications', { params: filters }).then(r => r.data),
  });

  const applications = data?.applications || [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Pengajuan Magang</Typography>
        <Typography variant="body2" color="text.secondary">Review dan kelola pengajuan magang mahasiswa ({applications.length} pengajuan)</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Cari nama/NIM/perusahaan..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> } }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
            <MenuItem value="">Semua</MenuItem>
            <MenuItem value="submitted">Diajukan</MenuItem>
            <MenuItem value="approved">Disetujui</MenuItem>
            <MenuItem value="rejected">Ditolak</MenuItem>
            <MenuItem value="letter_generated">Surat Terbit</MenuItem>
            <MenuItem value="signed">Ditandatangani</MenuItem>
            <MenuItem value="completed">Selesai</MenuItem>
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
                    <TableCell>Mahasiswa</TableCell>
                    <TableCell>NIM</TableCell>
                    <TableCell>Perusahaan</TableCell>
                    <TableCell>Posisi</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.map(app => (
                    <TableRow key={app.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{app.student_name}</TableCell>
                      <TableCell>{app.nim || '-'}</TableCell>
                      <TableCell>{app.company_name}</TableCell>
                      <TableCell>{app.position || '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(app.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell><Chip label={statusLabel(app.status)} color={statusColor(app.status)} size="small" /></TableCell>
                      <TableCell>
                        <Tooltip title="Lihat detail">
                          <IconButton size="small" onClick={() => setSelected(app)}>
                            <IconEye size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {applications.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Belum ada pengajuan magang</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <ReviewDialog open={!!selected} onClose={() => setSelected(null)} application={selected} />
    </Box>
  );
}
