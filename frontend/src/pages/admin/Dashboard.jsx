import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AdminDashboard() {
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get('/admin/import-jobs').then(r => r.data),
  });

  const users = usersData?.users || [];
  const stats = {
    total: users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin_upi: users.filter(u => u.role === 'admin_upi').length,
    dosen: users.filter(u => u.role === 'dosen').length,
    mahasiswa: users.filter(u => u.role === 'mahasiswa').length,
    pending: users.filter(u => u.status === 'pending_activation' || u.status === 'must_change_password').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Super Admin</h1>
        <p>Ringkasan sistem manajemen magang</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="label">Total User</div><div className="value">{stats.total}</div></div>
        <div className="stat-card"><div className="label">Mahasiswa</div><div className="value">{stats.mahasiswa}</div></div>
        <div className="stat-card"><div className="label">Dosen</div><div className="value">{stats.dosen}</div></div>
        <div className="stat-card"><div className="label">Admin UPI</div><div className="value">{stats.admin_upi}</div></div>
        <div className="stat-card"><div className="label">Pending Activation</div><div className="value">{stats.pending}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Riwayat Import Terakhir</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>File</th>
                <th>Total</th>
                <th>Sukses</th>
                <th>Gagal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(jobsData?.jobs || []).slice(0, 10).map(job => (
                <tr key={job.id}>
                  <td>{new Date(job.created_at).toLocaleString('id-ID')}</td>
                  <td>{job.type}</td>
                  <td>{job.file_name}</td>
                  <td>{job.total_rows}</td>
                  <td><span className="badge badge-success">{job.success_rows}</span></td>
                  <td>{job.failed_rows > 0 ? <span className="badge badge-danger">{job.failed_rows}</span> : '-'}</td>
                  <td><span className="badge badge-info">{job.status}</span></td>
                </tr>
              ))}
              {(!jobsData?.jobs || jobsData.jobs.length === 0) && (
                <tr><td colSpan={7} className="empty-state">Belum ada riwayat import</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
