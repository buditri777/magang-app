import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export default function MahasiswaDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get('/applications/my').then(r => r.data),
  });

  const apps = data?.applications || [];
  const stats = {
    total: apps.length,
    submitted: apps.filter(a => ['submitted', 'under_review'].includes(a.status)).length,
    approved: apps.filter(a => ['approved', 'letter_generated', 'signed', 'completed'].includes(a.status)).length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Halo, {user?.full_name} 👋</h1>
        <p>Selamat datang di Sistem Manajemen Magang</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="label">Total Pengajuan</div><div className="value">{stats.total}</div></div>
        <div className="stat-card"><div className="label">Sedang Diproses</div><div className="value">{stats.submitted}</div></div>
        <div className="stat-card"><div className="label">Disetujui</div><div className="value">{stats.approved}</div></div>
        <div className="stat-card"><div className="label">Ditolak</div><div className="value">{stats.rejected}</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Pengajuan Terbaru</h2>
          <button className="btn btn-primary" onClick={() => navigate('/mahasiswa/apply')}>
            + Ajukan Magang Baru
          </button>
        </div>
        {apps.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada pengajuan magang.</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/mahasiswa/apply')}>
              Ajukan Sekarang
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Perusahaan</th><th>Posisi</th><th>Periode</th><th>Status</th></tr>
              </thead>
              <tbody>
                {apps.slice(0, 5).map(app => (
                  <tr key={app.id}>
                    <td>{app.company_name}</td>
                    <td>{app.position || '-'}</td>
                    <td>{new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}</td>
                    <td><StatusBadge status={app.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
