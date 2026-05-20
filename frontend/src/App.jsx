import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';
import Layout from './components/layout/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminImport from './pages/admin/Import';
import MahasiswaDashboard from './pages/mahasiswa/Dashboard';
import MahasiswaApply from './pages/mahasiswa/Apply';
import MahasiswaApplications from './pages/mahasiswa/Applications';
import AdminUpiDashboard from './pages/adminUpi/Dashboard';
import AdminUpiApplications from './pages/adminUpi/Applications';
import DosenDashboard from './pages/dosen/Dashboard';

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.status === 'must_change_password') return <Navigate to="/change-password" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  switch (user.role) {
    case 'super_admin': return <Navigate to="/admin" />;
    case 'admin_upi': return <Navigate to="/admin-upi" />;
    case 'dosen': return <Navigate to="/dosen" />;
    case 'mahasiswa': return <Navigate to="/mahasiswa" />;
    default: return <Navigate to="/login" />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Super Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><Layout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="import" element={<AdminImport />} />
            </Route>

            {/* Admin UPI */}
            <Route path="/admin-upi" element={<ProtectedRoute allowedRoles={['admin_upi']}><Layout /></ProtectedRoute>}>
              <Route index element={<AdminUpiDashboard />} />
              <Route path="applications" element={<AdminUpiApplications />} />
            </Route>

            {/* Dosen */}
            <Route path="/dosen" element={<ProtectedRoute allowedRoles={['dosen']}><Layout /></ProtectedRoute>}>
              <Route index element={<DosenDashboard />} />
            </Route>

            {/* Mahasiswa */}
            <Route path="/mahasiswa" element={<ProtectedRoute allowedRoles={['mahasiswa']}><Layout /></ProtectedRoute>}>
              <Route index element={<MahasiswaDashboard />} />
              <Route path="apply" element={<MahasiswaApply />} />
              <Route path="applications" element={<MahasiswaApplications />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
