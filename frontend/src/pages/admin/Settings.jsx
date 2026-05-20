import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Alert,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, Grid,
} from '@mui/material';
import { IconPlus, IconTrash, IconArrowUp, IconArrowDown, IconDeviceFloppy } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import api from '../../lib/api';

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings),
  });

  const [periodYear, setPeriodYear] = useState('');
  const [periodSemester, setPeriodSemester] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [flowSteps, setFlowSteps] = useState([]);
  const [newStep, setNewStep] = useState('');

  useEffect(() => {
    if (settingsData) {
      setPeriodYear(settingsData.active_period_year?.value || '');
      setPeriodSemester(settingsData.active_period_semester?.value || '');
      setPeriodLabel(settingsData.active_period_label?.value || '');
      try {
        setFlowSteps(JSON.parse(settingsData.internship_flow?.value || '[]'));
      } catch { setFlowSteps([]); }
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (settings) => api.put('/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries(['app-settings']);
      enqueueSnackbar('Settings berhasil disimpan', { variant: 'success' });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.error || 'Gagal menyimpan', { variant: 'error' }),
  });

  const savePeriod = () => {
    saveMutation.mutate({
      active_period_year: periodYear,
      active_period_semester: periodSemester,
      active_period_label: periodLabel,
    });
  };

  const saveFlow = () => {
    saveMutation.mutate({
      internship_flow: JSON.stringify(flowSteps),
    });
  };

  const addStep = () => {
    if (newStep.trim()) {
      setFlowSteps([...flowSteps, newStep.trim()]);
      setNewStep('');
    }
  };

  const removeStep = (i) => setFlowSteps(flowSteps.filter((_, idx) => idx !== i));
  const moveUp = (i) => {
    if (i === 0) return;
    const arr = [...flowSteps];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    setFlowSteps(arr);
  };
  const moveDown = (i) => {
    if (i === flowSteps.length - 1) return;
    const arr = [...flowSteps];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    setFlowSteps(arr);
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Pengaturan Sistem</Typography>
        <Typography variant="body2" color="text.secondary">Konfigurasi periode magang dan alur proses</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Periode Magang Aktif</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Tahun Akademik"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(e.target.value)}
                  fullWidth
                  placeholder="2026"
                />
                <TextField
                  label="Semester"
                  value={periodSemester}
                  onChange={(e) => setPeriodSemester(e.target.value)}
                  fullWidth
                  placeholder="Genap"
                />
                <TextField
                  label="Label Tampilan (ditampilkan ke semua user)"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  fullWidth
                  placeholder="Tahun Akademik 2025/2026 - Semester Genap"
                />
                <Button
                  variant="contained"
                  startIcon={<IconDeviceFloppy size={18} />}
                  onClick={savePeriod}
                  disabled={saveMutation.isPending}
                >
                  Simpan Periode
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>Alur Proses Magang</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Tahapan ini ditampilkan di dashboard semua user sebagai panduan.
              </Typography>

              <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                {flowSteps.map((step, i) => (
                  <ListItem key={i} sx={{ pr: 12 }}>
                    <ListItemText
                      primary={`${i + 1}. ${step}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => moveUp(i)} disabled={i === 0}>
                        <IconArrowUp size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => moveDown(i)} disabled={i === flowSteps.length - 1}>
                        <IconArrowDown size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeStep(i)}>
                        <IconTrash size={16} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {flowSteps.length === 0 && (
                  <ListItem><ListItemText primary="Belum ada tahapan" primaryTypographyProps={{ color: 'text.secondary' }} /></ListItem>
                )}
              </List>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Tambah tahapan baru..."
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStep()}
                />
                <Button variant="outlined" startIcon={<IconPlus size={16} />} onClick={addStep}>
                  Tambah
                </Button>
              </Stack>

              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy size={18} />}
                onClick={saveFlow}
                disabled={saveMutation.isPending}
                fullWidth
              >
                Simpan Alur Proses
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
