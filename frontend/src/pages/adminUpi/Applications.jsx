import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AdminUpiApplications() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [reviewModal, setReviewModal] = useState(null);
  const [letterNumber, setLetterNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['upi-applications', filters],
    queryFn: () => api.get('/applications', { params: filters }).then(r => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/applications/${id}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries(['upi-applications']);
      setReviewModal(null);
      setLetterNumber('');
      setRejectionReason('');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/applications/${id}/upload-signed`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['upi-applications']);
      setUploadFile(null);
      alert('Surat berhasil diupload');
    },
  });

  const apps = data?.applications || [];

  const handleApprove = (app) => {
    if (!letterNumber) return alert('Nomor surat wajib diisi');
    reviewMutation.mutate({ id: app.id, action: 'approve', letter_number: letterNumber });
  };

  const handleReject = (app) => {
    if (!rejectionReason) return alert('Alasan penolakan wajib diisi');
    reviewMutation.mutate({ id: app.id, action: 'reject', rejection_reason: rejectionReason });
  };

  const statusBadge = (status) => {
    const map = {
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
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pengajuan Surat Magang</h1>
        <p>Validasi, nomor surat, dan upload surat bertandatangan</p>
      </div>

      <div className="filters">
        <input
          placeholder="Cari mahasiswa/perusahaan..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Semua Status</option>
          <option value="submitted">Diajukan</option>
          <option value="approved">Disetujui</option>
          <option value="signed">Ditandatangani</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>NIM</th>
                  <th>Perusahaan</th>
                  <th>Kota</th>
                  <th>Periode</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id}>
                    <td>{app.student_name}</td>
                    <td>{app.nim}</td>
                    <td>{app.company_name}</td>
                    <td>{app.city}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(app.start_date).toLocaleDateString('id-ID')} -<br />
                      {new Date(app.end_date).toLocaleDateString('id-ID')}
                    </td>
                    <td>{statusBadge(app.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {app.status === 'submitted' && (
                          <button className="btn btn-sm btn-primary" onClick={() => setReviewModal(app)}>
                            Review
                          </button>
                        )}
                        {app.status === 'approved' && (
                          <label className="btn btn-sm btn-success" style={{ cursor: 'pointer' }}>
                            ⬆ Upload TTD
                            <input type="file" hidden onChange={(e) => {
                              if (e.target.files[0]) uploadMutation.mutate({ id: app.id, file: e.target.files[0] });
                            }} />
                          </label>
                        )}
                        {app.status === 'signed' && (
                          <span className="badge badge-success">✓ Selesai</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {apps.length === 0 && <tr><td colSpan={7} className="empty-state">Tidak ada data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ marginBottom: '16px' }}>Review Pengajuan</h2>
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <strong>{reviewModal.student_name}</strong> ({reviewModal.nim})<br />
              <small>{reviewModal.company_name} - {reviewModal.city}</small>
            </div>

            <div className="form-group">
              <label>Nomor Surat (untuk approve)</label>
              <input value={letterNumber} onChange={(e) => setLetterNumber(e.target.value)} placeholder="Contoh: 001/UN40.FT/PL/2026" />
            </div>

            <div className="form-group">
              <label>Alasan Penolakan (untuk reject)</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Alasan jika ditolak..." />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button className="btn btn-success" onClick={() => handleApprove(reviewModal)} disabled={reviewMutation.isPending}>
                ✓ Setujui
              </button>
              <button className="btn btn-danger" onClick={() => handleReject(reviewModal)} disabled={reviewMutation.isPending}>
                ✗ Tolak
              </button>
              <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
