import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const menuItems = {
  super_admin: [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Manajemen User', icon: '👥' },
    { path: '/admin/import', label: 'Import Data', icon: '📥' },
  ],
  admin_upi: [
    { path: '/admin-upi', label: 'Dashboard', icon: '📊' },
    { path: '/admin-upi/applications', label: 'Pengajuan Surat', icon: '📋' },
  ],
  dosen: [
    { path: '/dosen', label: 'Dashboard', icon: '📊' },
  ],
  mahasiswa: [
    { path: '/mahasiswa', label: 'Dashboard', icon: '📊' },
    { path: '/mahasiswa/apply', label: 'Ajukan Magang', icon: '✏️' },
    { path: '/mahasiswa/applications', label: 'Riwayat Pengajuan', icon: '📋' },
  ],
};

const roleLabels = {
  super_admin: 'Super Admin',
  admin_upi: 'Admin UPI',
  dosen: 'Dosen',
  mahasiswa: 'Mahasiswa',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = menuItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Magang UPI
          <small>Sistem Manajemen Magang</small>
        </div>
        <nav>
          {items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/admin' || item.path === '/admin-upi' || item.path === '/dosen' || item.path === '/mahasiswa'}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-name">{user?.full_name}</div>
          <div className="user-role">{roleLabels[user?.role]}</div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
