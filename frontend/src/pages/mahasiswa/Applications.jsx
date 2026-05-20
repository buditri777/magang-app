import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack, Alert, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material';
import { IconDownload, IconFileDownload, IconUsers, IconUpload, IconFile, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

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

function UploadLoaDialog({ open, onClose, appId }) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [file, setFile] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post(`/applications/${appId}/upload-loa`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      enqueueSnackbar(res.data.message, { variant: 'success' });
      queryClient.invalidateQueries(['my-applications']);
      handleClose();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.error || 'Gagal upload LoA', { variant: 'error' });
    },
  });

  const handleSubmit = () => {
    if (!file) {
      enqueueSnackbar('Pilih file terlebih dahulu', { variant: 'warning' });
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData);
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Surat Penerimaan Magang (LoA)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload surat penerimaan/balasan dari perusahaan tempat magang. Format: PDF, JPG, atau PNG (maks 10MB).
        </Typography>
        <Button
          variant="outlined"
          component="label"
          startIcon={<IconUpload size={18} />}
          fullWidth
          sx={{ py: 2, borderStyle: 'dashed' }}
        >
          {file ? file.name : 'Pilih File LoA'}
          <input
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </Button>
        {file && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
            <IconFile size={16} />
            <Typography variant="body2">{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Batal</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!file || uploadMutation.isPending}
          startIcon={<IconUpload size={16} />}
        >
          {uploadMutation.isPending ? 'Mengupload...' : 'Upload LoA'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MahasiswaApplications() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [uploadAppId, setUploadAppId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/my').then(r => r.data),
  });

  const deleteLoaMutation = useMutation({
    mutationFn: (appId) => api.delete(`/applications/${appId}/loa`),
    onSuccess: () => {
      enqueueSnackbar('LoA berhasil dihapus', { variant: 'success' });
      queryClient.invalidateQueries(['my-applications']);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.error || 'Gagal menghapus LoA', { variant: 'error' });
    },
  });

  const apps = data?.applications || [];

  const downloadLetter = (appId) => {
    window.open(`/api/applications/${appId}/generate-letter`, '_blank');
  };

  const downloadSigned = async (appId) => {
    try {
      const res = await api.get(`/applications/${appId}/download-signed`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surat_magang_${appId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Surat bertandatangan belum tersedia', { variant: 'warning' });
    }
  };

  const downloadLoa = async (appId) => {
    try {
      const res = await api.get(`/applications/${appId}/download-loa`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LoA_${appId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Gagal download LoA', { variant: 'error' });
    }
  };

  const viewApplicants = async (companyId, companyName) => {
    try {
      const res = await api.get(`/companies/${companyId}/applicants`);
      const list = res.data.applicants;
      if (list.length === 0) {
        enqueueSnackbar(`Belum ada mahasiswa lain di ${companyName}`, { variant: 'info' });
      } else {
        const names = list.map(a => `${a.full_name} (${a.nim})`).join(', ');
        enqueueSnackbar(`Mahasiswa di ${companyName}: ${names}`, { variant: 'info', autoHideDuration: 8000 });
      }
    } catch {
      enqueueSnackbar('Gagal memuat data', { variant: 'error' });
    }
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Riwayat Pengajuan</Typography>
        <Typography variant="body2" color="text.secondary">Daftar semua pengajuan surat pengantar magang Anda</Typography>
      </Box>

      {apps.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h4" color="text.secondary" sx={{ mb: 1 }}>Belum ada pengajuan</Typography>
            <Typography variant="body2" color="text.secondary">Silakan ajukan magang melalui menu "Ajukan Magang"</Typography>
          </CardContent>
        </Card>
      ) : (
        apps.map(app => {
          const st = statusMap[app.status] || { label: app.status, color: 'default' };
          const canDownloadLetter = ['approved', 'letter_generated', 'signed', 'completed'].includes(app.status);
          const canUploadLoa = ['approved', 'letter_generated', 'signed', 'completed'].includes(app.status);
          return (
            <Card key={app.id} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="h4">{app.company_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {app.company_city} • {app.position || 'Posisi belum ditentukan'}
                    </Typography>
                  </Box>
                  <Chip label={st.label} color={st.color} size="small" />
                </Stack>

                <Grid container spacing={2} sx={{ mt: 1.5, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">Periode</Typography>
                    <Typography variant="body2">
                      {new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">Divisi</Typography>
                    <Typography variant="body2">{app.division || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">No. Surat</Typography>
                    <Typography variant="body2">{app.letter_number || app.final_letter_number || '-'}</Typography>
                  </Grid>
                </Grid>

                {app.rejection_reason && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>Alasan ditolak:</strong> {app.rejection_reason}
                  </Alert>
                )}

                {/* LoA Status */}
                {canUploadLoa && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: app.loa_file_name ? 'success.50' : 'warning.50', borderRadius: 2, border: 1, borderColor: app.loa_file_name ? 'success.200' : 'warning.200' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Surat Penerimaan Magang (LoA)
                        </Typography>
                        {app.loa_file_name ? (
                          <Typography variant="body2" color="text.secondary">
                            ✅ {app.loa_file_name} • Diupload {new Date(app.loa_uploaded_at).toLocaleDateString('id-ID')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Belum diupload — upload surat balasan dari perusahaan
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {app.loa_file_name && (
                          <>
                            <Button size="small" variant="outlined" color="success" startIcon={<IconDownload size={16} />} onClick={() => downloadLoa(app.id)}>
                              Download
                            </Button>
                            <Tooltip title="Hapus LoA">
                              <IconButton size="small" color="error" onClick={() => deleteLoaMutation.mutate(app.id)}>
                                <IconTrash size={16} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Button size="small" variant={app.loa_file_name ? 'outlined' : 'contained'} startIcon={<IconUpload size={16} />} onClick={() => setUploadAppId(app.id)}>
                          {app.loa_file_name ? 'Ganti' : 'Upload LoA'}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                  {canDownloadLetter && (
                    <Button size="small" variant="contained" startIcon={<IconFileDownload size={16} />} onClick={() => downloadLetter(app.id)}>
                      Download Surat
                    </Button>
                  )}
                  {app.is_signed && (
                    <Button size="small" variant="contained" color="success" startIcon={<IconDownload size={16} />} onClick={() => downloadSigned(app.id)}>
                      Surat Bertandatangan
                    </Button>
                  )}
                  <Button size="small" variant="outlined" startIcon={<IconUsers size={16} />} onClick={() => viewApplicants(app.company_id, app.company_name)}>
                    Mahasiswa Lain
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })
      )}

      <UploadLoaDialog
        open={!!uploadAppId}
        onClose={() => setUploadAppId(null)}
        appId={uploadAppId}
      />
    </Box>
  );
}
