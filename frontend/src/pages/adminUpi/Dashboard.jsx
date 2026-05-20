import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function AdminUpiDashboard() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['admin-upi-applications'],
    queryFn: () => api.get('/applications').then(r => r.data),
  });

  const apps = data?.applications || [];
  const stats = {
    total: apps.length,
    submitted: apps.filter(a => a.status === 'submitted').length,
    under_review: apps.filter(a => a.status === 'under_review').length,
    approved: apps.filter(a => ['approved', 'letter_generated'].includes(a.status)).length,
    signed: apps.filter(a => a.status === 'signed').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Admin UPI</h1>
        <p>Manajemen pengajuan surat pengantar magang</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="label">Total Pengajuan</div><div className="value">{stats.total}</div></div>
        <div className="stat-card"><div className="label">Perlu Direview</div><div className="value">{stats.submitted}</div></div>
        <div className="stat-card"><div className="label">Disetujui</div><div className="value">{stats.approved}</div></div>
        <div className="stat-card"><div className="label">Sudah Ditandatangani</div><div className="value">{stats.signed}</div></div>
        <div className="stat-card"><div className="label">Ditolak</div><div className="value">{stats.rejected}</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Antrian Validasi</h2>
          <button className="btn btn-primary" onClick={() => navigate('/admin-upi/applications')}>
            Lihat Semua
          </button>
        </div>
        {stats.submitted === 0 ? (
          <div className="empty-state">Tidak ada pengajuan yang perlu direview</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mahasiswa</th><th>NIM</th><th>Perusahaan</th><th>Periode</th><th></th></tr></thead>
              <tbody>
                {apps.filter(a => a.status === 'submitted').slice(0, 10).map(app => (
                  <tr key={app.id}>
                    <td>{app.student_name}</td>
                    <td>{app.nim}</td>
                    <td>{app.company_name}</td>
                    <td>{new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin-upi/applications?id=${app.id}`)}>
                        Review
                      </button>
                    </td>
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
