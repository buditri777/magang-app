import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export default function DosenDashboard() {
  const { user } = useAuth();

  const { data: studentsData } = useQuery({
    queryKey: ['dosen-students'],
    queryFn: () => api.get('/dosen/students').then(r => r.data),
  });

  const { data: appsData } = useQuery({
    queryKey: ['dosen-applications'],
    queryFn: () => api.get('/dosen/applications').then(r => r.data),
  });

  const students = studentsData?.students || [];
  const apps = appsData?.applications || [];

  const statusBadge = (status) => {
    const map = {
      submitted: ['badge-info', 'Diajukan'],
      under_review: ['badge-warning', 'Ditinjau'],
      rejected: ['badge-danger', 'Ditolak'],
      approved: ['badge-success', 'Disetujui'],
      signed: ['badge-success', 'Ditandatangani'],
    };
    const [cls, label] = map[status] || ['badge-default', status];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Halo, {user?.full_name} 👋</h1>
        <p>Dashboard pemantauan mahasiswa bimbingan</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="label">Mahasiswa Bimbingan</div><div className="value">{students.length}</div></div>
        <div className="stat-card"><div className="label">Total Pengajuan</div><div className="value">{apps.length}</div></div>
        <div className="stat-card"><div className="label">Sedang Magang</div><div className="value">{apps.filter(a => a.status === 'signed').length}</div></div>
        <div className="stat-card"><div className="label">Menunggu Review</div><div className="value">{apps.filter(a => a.status === 'submitted').length}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Mahasiswa Bimbingan</h2></div>
        {students.length === 0 ? (
          <div className="empty-state">Belum ada mahasiswa bimbingan</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>NIM</th><th>Nama</th><th>Program Studi</th><th>Angkatan</th><th>Email</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.nim}</td>
                    <td>{s.full_name}</td>
                    <td>{s.program_studi}</td>
                    <td>{s.angkatan}</td>
                    <td>{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h2>Pengajuan Magang</h2></div>
        {apps.length === 0 ? (
          <div className="empty-state">Belum ada pengajuan</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mahasiswa</th><th>Perusahaan</th><th>Periode</th><th>Status</th></tr></thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id}>
                    <td>{app.student_name} ({app.nim})</td>
                    <td>{app.company_name} - {app.city}</td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(app.start_date).toLocaleDateString('id-ID')} - {new Date(app.end_date).toLocaleDateString('id-ID')}</td>
                    <td>{statusBadge(app.status)}</td>
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
