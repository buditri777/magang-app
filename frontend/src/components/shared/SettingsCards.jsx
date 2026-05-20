import {
  Card, CardContent, Typography, Stepper, Step, StepLabel, Chip, Box, Stack,
} from '@mui/material';
import { IconCalendar, IconRoute } from '@tabler/icons-react';
import { useSettings, getInternshipFlow, getActivePeriod } from '../../hooks/useSettings';

export function PeriodCard() {
  const { data: settings } = useSettings();
  const period = getActivePeriod(settings);

  return (
    <Card sx={{ borderLeft: '4px solid', borderColor: 'primary.main' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}><IconCalendar size={28} /></Box>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Periode Magang Aktif</Typography>
          <Typography variant="h4">{period}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function InternshipFlowCard() {
  const { data: settings } = useSettings();
  const steps = getInternshipFlow(settings);

  if (steps.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconRoute size={22} color="#1565c0" />
          <Typography variant="h4">Alur Proses Magang</Typography>
        </Stack>
        <Stepper activeStep={-1} orientation="vertical" sx={{ pl: 1 }}>
          {steps.map((step, i) => (
            <Step key={i} active={false} completed={false}>
              <StepLabel>
                <Typography variant="body2">{step}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
}
