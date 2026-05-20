import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ role: '', status: '', search: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => api.get('/admin/users', { params: filters }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => alert(`Password direset: ${res.data.temp_password}`),
  });

  const users = data?.users || [];

  const statusBadge = (status) => {
    const map = { active: 'badge-success', inactive: 'badge-danger', must_change_password: 'badge-warning', pending_activation: 'badge-info' };
    return <span className={`badge ${map[status] || 'badge-default'}`}>{status}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manajemen User</h1>
        <p>Kelola akun pengguna sistem</p>
      </div>

      <div className="filters">
        <input
          placeholder="Cari nama/email..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.role} onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}>
          <option value="">Semua Role</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin_upi">Admin UPI</option>
          <option value="dosen">Dosen</option>
          <option value="mahasiswa">Mahasiswa</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Semua Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="must_change_password">Must Change Password</option>
          <option value="pending_activation">Pending Activation</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? <div className="loading">Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td><span className="badge badge-default">{user.role}</span></td>
                    <td>{statusBadge(user.status)}</td>
                    <td>{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {user.status === 'active' ? (
                          <button className="btn btn-sm btn-danger" onClick={() => updateMutation.mutate({ id: user.id, status: 'inactive' })}>
                            Nonaktifkan
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-success" onClick={() => updateMutation.mutate({ id: user.id, status: 'active' })}>
                            Aktifkan
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => resetMutation.mutate(user.id)}>
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="empty-state">Tidak ada user</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
