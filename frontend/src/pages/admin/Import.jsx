import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Alert, Stack, Divider,
} from '@mui/material';
import { IconDownload, IconUpload, IconUsers, IconUserCheck } from '@tabler/icons-react';
import api from '../../lib/api';

export default function AdminImport() {
  const [studentFile, setStudentFile] = useState(null);
  const [lecturerFile, setLecturerFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const downloadTemplate = async (type) => {
    const res = await api.get(`/admin/templates/${type}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (type, file) => {
    if (!file) return alert('Pilih file dulu');
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post(`/admin/import/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ type, ...res.data });
    } catch (err) {
      setResult({ type, error: err.response?.data?.error || 'Gagal import' });
    } finally {
      setLoading(false);
    }
  };

  const ImportSection = ({ icon, title, type, file, setFile, hint }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          {icon}
          <Typography variant="h4">{title}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<IconDownload size={18} />}
            onClick={() => downloadTemplate(type)}
          >
            Template Excel
          </Button>
          <Button
            variant="outlined"
            component="label"
            sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none' }}
          >
            {file ? file.name : 'Pilih file Excel...'}
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<IconUpload size={18} />}
            disabled={loading || !file}
            onClick={() => importFile(type, file)}
          >
            {loading ? 'Memproses...' : 'Import'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Import Data Master</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload data mahasiswa dan dosen secara massal dari Excel
        </Typography>
      </Box>

      {result && (
        <Alert severity={result.error ? 'error' : 'success'} sx={{ mb: 3 }}>
          {result.error ? (
            <>Error: {result.error}</>
          ) : (
            <>
              Import {result.type} selesai: <strong>{result.success} sukses</strong>, {result.failed} gagal.
              {result.errors?.length > 0 && (
                <Box component="ul" sx={{ mt: 1, ml: 2 }}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e.row}: {e.error}</li>
                  ))}
                </Box>
              )}
            </>
          )}
        </Alert>
      )}

      <ImportSection
        icon={<IconUsers size={24} color="#2196f3" />}
        title="Import Mahasiswa"
        type="students"
        file={studentFile}
        setFile={setStudentFile}
        hint="Format: NIM, Nama, Email, Program Studi, Fakultas, Angkatan, Nomor HP, NIDN Pembimbing"
      />

      <ImportSection
        icon={<IconUserCheck size={24} color="#673ab7" />}
        title="Import Dosen"
        type="lecturers"
        file={lecturerFile}
        setFile={setLecturerFile}
        hint="Format: NIDN, Nama, Email, Program Studi, Fakultas, Nomor HP"
      />

      <Alert severity="info">
        <strong>Catatan:</strong> Setelah import, akun otomatis dibuat dengan password sementara.
        User wajib mengganti password saat login pertama. Email pengiriman password belum dikonfigurasi
        — sementara password tersimpan di log database.
      </Alert>
    </Box>
  );
}
