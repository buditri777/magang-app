import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function MahasiswaApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: pilih perusahaan, 2: form pengajuan
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', address: '', city: '', contact: '' });

  const [form, setForm] = useState({
    position: '',
    division: '',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const searchCompanies = async () => {
    if (search.length < 2) return;
    const res = await api.get('/companies', { params: { search } });
    setCompanies(res.data.companies);
    setShowAddCompany(res.data.companies.length === 0);
  };

  const addCompany = async () => {
    setError('');
    try {
      const res = await api.post('/companies', newCompany);
      setSelectedCompany(res.data);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 409) {
        setSelectedCompany(err.response.data.existing);
        setError(`Perusahaan dengan nama serupa sudah ada: "${err.response.data.existing.name}". Silakan pilih perusahaan ini.`);
        searchCompanies();
      } else {
        setError(err.response?.data?.error || 'Gagal menambahkan perusahaan');
      }
    }
  };

  const submitApplication = async () => {
    if (!selectedCompany) return setError('Pilih perusahaan dulu');
    if (!form.start_date || !form.end_date) return setError('Tanggal wajib diisi');
    if (form.start_date >= form.end_date) return setError('Tanggal mulai harus sebelum tanggal selesai');

    setSubmitting(true);
    setError('');
    try {
      await api.post('/applications', { company_id: selectedCompany.id, ...form });
      alert('Pengajuan berhasil dikirim!');
      navigate('/mahasiswa/applications');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengirim pengajuan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Ajukan Magang</h1>
        <p>Isi form pengajuan surat pengantar magang</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div className="card">
          <div className="card-header"><h2>Step 1: Pilih Perusahaan</h2></div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              placeholder="Cari nama atau alamat perusahaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCompanies()}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            <button className="btn btn-primary" onClick={searchCompanies}>🔍 Cari</button>
          </div>

          {companies.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nama</th><th>Alamat</th><th>Kota</th><th></th></tr></thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.address}</td>
                      <td>{c.city}</td>
                      <td>
                        <button className="btn btn-sm btn-success" onClick={() => { setSelectedCompany(c); setStep(2); }}>
                          Pilih
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ marginBottom: '12px', color: '#64748b', fontSize: '0.9rem' }}>
              Perusahaan tidak ditemukan? Tambahkan baru:
            </p>
            <button className="btn btn-secondary" onClick={() => setShowAddCompany(!showAddCompany)}>
              {showAddCompany ? 'Tutup' : '+ Tambah Perusahaan Baru'}
            </button>

            {showAddCompany && (
              <div style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Nama Perusahaan *</label>
                  <input value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Alamat *</label>
                  <input value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Kota *</label>
                    <input value={newCompany.city} onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Kontak</label>
                    <input value={newCompany.contact} onChange={(e) => setNewCompany({ ...newCompany, contact: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={addCompany}>
                  Simpan & Lanjut
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && selectedCompany && (
        <div className="card">
          <div className="card-header">
            <h2>Step 2: Detail Pengajuan</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => setStep(1)}>← Ganti Perusahaan</button>
          </div>

          <div className="alert alert-info">
            <strong>Perusahaan dipilih:</strong> {selectedCompany.name}<br />
            <small>{selectedCompany.address}{selectedCompany.city ? `, ${selectedCompany.city}` : ''}</small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Posisi / Jabatan</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Contoh: Software Engineer Intern" />
            </div>
            <div className="form-group">
              <label>Divisi</label>
              <input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} placeholder="Contoh: IT Department" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Tanggal Mulai *</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tanggal Selesai *</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Catatan Tambahan</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informasi tambahan jika ada" />
          </div>

          <button className="btn btn-success btn-block" onClick={submitApplication} disabled={submitting}>
            {submitting ? 'Mengirim...' : '📤 Submit Pengajuan'}
          </button>
        </div>
      )}
    </div>
  );
}
