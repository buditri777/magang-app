import { useState } from 'react';
import api from '../../lib/api';

export default function AdminImport() {
  const [studentFile, setStudentFile] = useState(null);
  const [lecturerFile, setLecturerFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const downloadTemplate = async (type) => {
    const res = await api.get(`/admin/templates/${type}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (type, file) => {
    if (!file) return alert('Pilih file dulu');
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post(`/admin/import/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({ type, ...res.data });
    } catch (err) {
      setResult({ type, error: err.response?.data?.error || 'Gagal import' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Import Data Master</h1>
        <p>Upload data mahasiswa dan dosen secara massal dari Excel</p>
      </div>

      {result && (
        <div className={`alert ${result.error ? 'alert-error' : 'alert-success'}`}>
          {result.error ? (
            <>Error: {result.error}</>
          ) : (
            <>
              Import {result.type} selesai: <strong>{result.success} sukses</strong>, {result.failed} gagal.
              {result.errors?.length > 0 && (
                <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e.row}: {e.error}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header"><h2>📚 Import Mahasiswa</h2></div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => downloadTemplate('students')}>
            ⬇ Download Template Excel
          </button>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setStudentFile(e.target.files[0])} />
          <button className="btn btn-primary" disabled={loading} onClick={() => importFile('students', studentFile)}>
            {loading ? 'Memproses...' : 'Upload & Import'}
          </button>
        </div>
        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
          Format: NIM, Nama, Email, Program Studi, Fakultas, Angkatan, Nomor HP, NIDN Pembimbing
        </p>
      </div>

      <div className="card">
        <div className="card-header"><h2>👨‍🏫 Import Dosen</h2></div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => downloadTemplate('lecturers')}>
            ⬇ Download Template Excel
          </button>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setLecturerFile(e.target.files[0])} />
          <button className="btn btn-primary" disabled={loading} onClick={() => importFile('lecturers', lecturerFile)}>
            {loading ? 'Memproses...' : 'Upload & Import'}
          </button>
        </div>
        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
          Format: NIDN, Nama, Email, Program Studi, Fakultas, Nomor HP
        </p>
      </div>

      <div className="alert alert-info">
        <strong>Catatan:</strong> Setelah import, akun otomatis dibuat dengan password sementara. User wajib mengganti password saat login pertama.
        <br />Email pengiriman password belum dikonfigurasi - sementara password tersimpan di log database.
      </div>
    </div>
  );
}
