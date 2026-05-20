import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function MahasiswaApplications() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/my').then(r => r.data),
  });

  const apps = data?.applications || [];

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
      alert('Surat belum tersedia');
    }
  };

  const viewApplicants = async (companyId, companyName) => {
    try {
      const res = await api.get(`/companies/${companyId}/applicants`);
      const list = res.data.applicants;
      if (list.length === 0) {
        alert(`Belum ada mahasiswa lain yang mendaftar di ${companyName}`);
      } else {
        const names = list.map(a => `• ${a.full_name} (${a.nim}) - ${a.program_studi}`).join('\n');
        alert(`Mahasiswa di ${companyName}:\n\n${names}`);
      }
    } catch {
      alert('Gagal memuat data');
    }
  };

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Riwayat Pengajuan</h1>
        <p>Daftar semua pengajuan surat pengantar magang Anda</p>
      </div>

      {apps.length === 0 ? (
        <div className="card empty-state">Belum ada pengajuan</div>
      ) : (
        apps.map(app => (
          <div className="card" key={app.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{app.company_name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {app.company_city} • {app.position || 'Posisi belum ditentukan'}
                </p>
              </div>
              <StatusBadge status={app.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div><small style={{ color: '#64748b' }}>Periode</small><br />{new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}</div>
              <div><small style={{ color: '#64748b' }}>Divisi</small><br />{app.division || '-'}</div>
              <div><small style={{ color: '#64748b' }}>No. Surat</small><br />{app.letter_number || app.final_letter_number || '-'}</div>
            </div>

            {app.rejection_reason && (
              <div className="alert alert-error" style={{ marginTop: '12px' }}>
                <strong>Alasan ditolak:</strong> {app.rejection_reason}
              </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {app.is_signed && (
                <button className="btn btn-sm btn-success" onClick={() => downloadSigned(app.id)}>
                  ⬇ Download Surat
                </button>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => viewApplicants(app.company_id, app.company_name)}>
                👥 Lihat Mahasiswa Lain
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: ['badge-default', 'Draft'],
    submitted: ['badge-info', 'Diajukan'],
    under_review: ['badge-warning', 'Ditinjau'],
    rejected: ['badge-danger', 'Ditolak'],
    approved: ['badge-success', 'Disetujui'],
    letter_generated: ['badge-success', 'Surat Dibuat'],
    signed: ['badge-success', 'Ditandatangani'],
    completed: ['badge-success', 'Selesai'],
  };
  const [cls, label] = map[status] || ['badge-default', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
