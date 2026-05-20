import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Grid, Stepper, Step, StepLabel,
} from '@mui/material';
import { IconSearch, IconPlus, IconArrowLeft } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

export default function MahasiswaApply() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', address: '', city: '', contact: '' });

  const [form, setForm] = useState({
    position: '', division: '', start_date: '', end_date: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchCompanies = async () => {
    if (search.length < 2) return;
    const res = await api.get('/companies', { params: { search } });
    setCompanies(res.data.companies);
    setShowAddCompany(res.data.companies.length === 0);
  };

  const addCompany = async () => {
    setError('');
    try {
      const res = await api.post('/companies', newCompany);
      setSelectedCompany(res.data);
      setStep(1);
    } catch (err) {
      if (err.response?.status === 409) {
        setSelectedCompany(err.response.data.existing);
        setError(`Perusahaan serupa sudah ada: "${err.response.data.existing.name}". Silakan pilih.`);
        searchCompanies();
      } else {
        setError(err.response?.data?.error || 'Gagal menambahkan perusahaan');
      }
    }
  };

  const submitApplication = async () => {
    if (!selectedCompany) return setError('Pilih perusahaan dulu');
    if (!form.start_date || !form.end_date) return setError('Tanggal wajib diisi');
    if (form.start_date >= form.end_date) return setError('Tanggal mulai harus sebelum tanggal selesai');

    setSubmitting(true);
    setError('');
    try {
      await api.post('/applications', { company_id: selectedCompany.id, ...form });
      enqueueSnackbar('Pengajuan berhasil dikirim!', { variant: 'success' });
      navigate('/mahasiswa/applications');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Ajukan Magang</Typography>
        <Typography variant="body2" color="text.secondary">Isi form pengajuan surat pengantar magang</Typography>
      </Box>

      <Stepper activeStep={step} sx={{ mb: 3 }}>
        <Step><StepLabel>Pilih Perusahaan</StepLabel></Step>
        <Step><StepLabel>Detail Pengajuan</StepLabel></Step>
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h4" sx={{ mb: 2 }}>Cari Perusahaan</Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Cari nama atau alamat perusahaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCompanies()}
              />
              <Button variant="contained" startIcon={<IconSearch size={18} />} onClick={searchCompanies}>
                Cari
              </Button>
            </Stack>

            {companies.length > 0 && (
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nama</TableCell>
                      <TableCell>Alamat</TableCell>
                      <TableCell>Kota</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {companies.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                        <TableCell>{c.address}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell>
                          <Button size="small" variant="contained" color="success" onClick={() => { setSelectedCompany(c); setStep(1); }}>
                            Pilih
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Perusahaan tidak ditemukan?
            </Typography>
            <Button variant="outlined" startIcon={<IconPlus size={18} />} onClick={() => setShowAddCompany(!showAddCompany)}>
              {showAddCompany ? 'Tutup' : 'Tambah Perusahaan Baru'}
            </Button>

            {showAddCompany && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Nama Perusahaan *" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Alamat *" value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth size="small" label="Kota *" value={newCompany.city} onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth size="small" label="Kontak" value={newCompany.contact} onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })} />
                  </Grid>
                </Grid>
                <Button variant="contained" sx={{ mt: 2 }} onClick={addCompany}>Simpan & Lanjut</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && selectedCompany && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4">Detail Pengajuan</Typography>
              <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => setStep(0)}>
                Ganti Perusahaan
              </Button>
            </Stack>

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Perusahaan:</strong> {selectedCompany.name}<br />
              <Typography variant="caption">{selectedCompany.address}{selectedCompany.city ? `, ${selectedCompany.city}` : ''}</Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Posisi / Jabatan" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Software Engineer Intern" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Divisi" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} placeholder="IT Department" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Tanggal Mulai *" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Tanggal Selesai *" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Catatan Tambahan" multiline rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informasi tambahan jika ada" />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              sx={{ mt: 3, py: 1.5 }}
              onClick={submitApplication}
              disabled={submitting}
            >
              {submitting ? 'Mengirim...' : '📤 Submit Pengajuan'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
