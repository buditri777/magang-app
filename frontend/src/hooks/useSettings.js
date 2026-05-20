import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: () => api.get('/settings').then(r => r.data.settings),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function getInternshipFlow(settings) {
  if (!settings?.internship_flow?.value) return [];
  try {
    return JSON.parse(settings.internship_flow.value);
  } catch {
    return [];
  }
}

export function getActivePeriod(settings) {
  return settings?.active_period_label?.value
    || `${settings?.active_period_semester?.value || ''} ${settings?.active_period_year?.value || ''}`.trim()
    || '—';
}
