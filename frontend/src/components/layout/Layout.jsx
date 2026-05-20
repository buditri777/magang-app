import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem,
  Divider, useTheme, useMediaQuery,
} from '@mui/material';
import {
  IconDashboard, IconUsers, IconUpload, IconClipboardList, IconPencil,
  IconHistory, IconMenu2, IconLogout, IconSchool, IconSettings,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';

const SIDEBAR_WIDTH = 260;

const menuItems = {
  super_admin: [
    { path: '/admin', label: 'Dashboard', icon: <IconDashboard size={20} />, end: true },
    { path: '/admin/users', label: 'Manajemen User', icon: <IconUsers size={20} /> },
    { path: '/admin/import', label: 'Import Data', icon: <IconUpload size={20} /> },
    { path: '/admin/settings', label: 'Pengaturan', icon: <IconSettings size={20} /> },
  ],
  admin_upi: [
    { path: '/admin-upi', label: 'Dashboard', icon: <IconDashboard size={20} />, end: true },
    { path: '/admin-upi/applications', label: 'Pengajuan Surat', icon: <IconClipboardList size={20} /> },
  ],
  dosen: [
    { path: '/dosen', label: 'Dashboard', icon: <IconDashboard size={20} />, end: true },
  ],
  mahasiswa: [
    { path: '/mahasiswa', label: 'Dashboard', icon: <IconDashboard size={20} />, end: true },
    { path: '/mahasiswa/apply', label: 'Ajukan Magang', icon: <IconPencil size={20} /> },
    { path: '/mahasiswa/applications', label: 'Riwayat Pengajuan', icon: <IconHistory size={20} /> },
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
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const items = menuItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
          <IconSchool size={22} />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ lineHeight: 1.2 }}>Magang UDB</Typography>
          <Typography variant="caption" color="text.secondary">
            Sistem Manajemen Magang
          </Typography>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        <Typography variant="caption" sx={{ px: 1.5, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Menu
        </Typography>
        <List sx={{ mt: 1 }}>
          {items.map((item) => {
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  end={item.end}
                  onClick={() => isMobile && setMobileOpen(false)}
                  sx={{
                    color: isActive ? 'primary.main' : 'text.primary',
                    bgcolor: isActive ? 'primary.light' : 'transparent',
                    '&:hover': { bgcolor: isActive ? 'primary.light' : 'grey.100' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body1', fontWeight: isActive ? 600 : 400 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ display: { md: 'none' }, color: 'text.primary', mr: 2 }}
          >
            <IconMenu2 />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle1" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {roleLabels[user?.role]}
              </Typography>
            </Box>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}>
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>{user?.email}</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><IconLogout size={18} /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
