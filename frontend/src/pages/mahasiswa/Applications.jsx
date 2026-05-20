import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack, Alert, Grid,
} from '@mui/material';
import { IconDownload, IconFileDownload, IconUsers } from '@tabler/icons-react';
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

export default function MahasiswaApplications() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/my').then(r => r.data),
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

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
    </Box>
  );
}
