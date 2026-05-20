import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Alert,
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import api from '../../lib/api';

const statusMap = {
  submitted: { label: 'Diajukan', color: 'info' },
  under_review: { label: 'Ditinjau', color: 'warning' },
  rejected: { label: 'Ditolak', color: 'error' },
  approved: { label: 'Disetujui', color: 'success' },
  letter_generated: { label: 'Surat Dibuat', color: 'success' },
  signed: { label: 'Ditandatangani', color: 'success' },
  completed: { label: 'Selesai', color: 'success' },
};

export default function AdminUpiApplications() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [reviewModal, setReviewModal] = useState(null);
  const [letterNumber, setLetterNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['upi-applications', filters],
    queryFn: () => api.get('/applications', { params: filters }).then(r => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/applications/${id}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['upi-applications']);
      setReviewModal(null);
      setLetterNumber('');
      setRejectionReason('');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/applications/${id}/upload-signed`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['upi-applications']);
      alert('Surat berhasil diupload');
    },
  });

  const apps = data?.applications || [];

  const handleApprove = () => {
    if (!letterNumber) return alert('Nomor surat wajib diisi');
    reviewMutation.mutate({ id: reviewModal.id, action: 'approve', letter_number: letterNumber });
  };

  const handleReject = () => {
    if (!rejectionReason) return alert('Alasan penolakan wajib diisi');
    reviewMutation.mutate({ id: reviewModal.id, action: 'reject', rejection_reason: rejectionReason });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Pengajuan Surat Magang</Typography>
        <Typography variant="body2" color="text.secondary">Validasi, nomor surat, dan upload surat bertandatangan</Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Cari mahasiswa/perusahaan..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> } }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
            <MenuItem value="">Semua</MenuItem>
            <MenuItem value="submitted">Diajukan</MenuItem>
            <MenuItem value="approved">Disetujui</MenuItem>
            <MenuItem value="signed">Ditandatangani</MenuItem>
            <MenuItem value="rejected">Ditolak</MenuItem>
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
                    <TableCell>Kota</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apps.map(app => {
                    const st = statusMap[app.status] || { label: app.status, color: 'default' };
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{app.student_name}</TableCell>
                        <TableCell>{app.nim}</TableCell>
                        <TableCell>{app.company_name}</TableCell>
                        <TableCell>{app.city}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {new Date(app.start_date).toLocaleDateString('id-ID')} -<br />
                          {new Date(app.end_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell><Chip label={st.label} size="small" color={st.color} /></TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {app.status === 'submitted' && (
                              <Button size="small" variant="contained" onClick={() => setReviewModal(app)}>
                                Review
                              </Button>
                            )}
                            {app.status === 'approved' && (
                              <Button size="small" variant="contained" color="success" component="label">
                                Upload TTD
                                <input type="file" hidden onChange={(e) => {
                                  if (e.target.files[0]) uploadMutation.mutate({ id: app.id, file: e.target.files[0] });
                                }} />
                              </Button>
                            )}
                            {app.status === 'signed' && (
                              <Chip label="✓ Selesai" size="small" color="success" />
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {apps.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Tidak ada data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={Boolean(reviewModal)} onClose={() => setReviewModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Pengajuan</DialogTitle>
        <DialogContent>
          {reviewModal && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{reviewModal.student_name}</strong> ({reviewModal.nim})<br />
                {reviewModal.company_name} - {reviewModal.city}
              </Alert>
              <TextField
                label="Nomor Surat (untuk approve)"
                fullWidth
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="Contoh: 001/UN40.FT/PL/2026"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Alasan Penolakan (untuk reject)"
                fullWidth
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Alasan jika ditolak..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReviewModal(null)}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={reviewMutation.isPending}>
            Tolak
          </Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={reviewMutation.isPending}>
            Setujui
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
