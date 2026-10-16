import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import LogoutIcon from '@mui/icons-material/Logout'
import QrCodeIcon from '@mui/icons-material/QrCode'
import SecurityIcon from '@mui/icons-material/Security'

import { useAuth } from '../context/AuthContext'
import { reconfigureMfaInit, verifyMfaSetup } from '../api/auth'
import MfaQrCard from './MfaQrCard'
import MfaCodeInput from './MfaCodeInput'

const DRAWER_FULL = 220
const DRAWER_MINI = 56

const NAV_ITEMS = [
  { label: 'Agencias', icon: <BusinessIcon />, path: '/' },
]

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout, refreshUser } = useAuth()

  // Estado del menú de usuario
  const [anchorEl, setAnchorEl] = useState(null)
  const menuOpen = Boolean(anchorEl)

  // Estado del modal de reconfiguración de MFA
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)
  const [mfaModalData, setMfaModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [modalSuccess, setModalSuccess] = useState(false)

  const drawerWidth = open ? DRAWER_FULL : DRAWER_MINI

  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleCloseUserMenu()
    logout()
    navigate('/login')
  }

  const handleOpenReconfigureMfa = async () => {
    handleCloseUserMenu()
    setModalError(null)
    setModalSuccess(false)
    setModalLoading(true)
    setMfaDialogOpen(true)
    try {
      const res = await reconfigureMfaInit()
      setMfaModalData(res.data)
    } catch {
      setModalError('No se pudo generar el código QR. Inténtalo de nuevo.')
    } finally {
      setModalLoading(false)
    }
  }

  const handleVerifyModalMfa = async (code) => {
    if (!mfaModalData?.setup_token) return
    setModalLoading(true)
    setModalError(null)
    try {
      await verifyMfaSetup(mfaModalData.setup_token, code)
      setModalSuccess(true)
      await refreshUser()
      setTimeout(() => {
        setMfaDialogOpen(false)
        setMfaModalData(null)
        setModalSuccess(false)
      }, 1500)
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Código incorrecto. Verifica tu app Authenticator.')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Top bar ── */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" fontWeight={700} letterSpacing={1} noWrap>
            AEC IVRS
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, ml: 1 }} noWrap>
            Dalton IVR Manager
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Menú y datos del usuario autenticado */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<SecurityIcon sx={{ fontSize: '1rem !important', color: '#fff !important' }} />}
                label="MFA Activo"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.18)',
                  color: '#fff',
                  fontWeight: 600,
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              />
              <Tooltip title="Cuenta y opciones de seguridad">
                <Button
                  onClick={handleOpenUserMenu}
                  color="inherit"
                  sx={{
                    textTransform: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      bgcolor: 'secondary.main',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} sx={{ display: { xs: 'none', md: 'block' } }}>
                    {user.username}
                  </Typography>
                </Button>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleCloseUserMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  elevation: 4,
                  sx: { minWidth: 220, mt: 1, borderRadius: 2 },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {user.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sesión protegida con 2FA
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleOpenReconfigureMfa}>
                  <ListItemIcon>
                    <QrCodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Reconfigurar MFA (QR)" secondary="Cambiar de dispositivo" />
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'error.main' }}>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Cerrar sesión" />
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Side drawer ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            overflowX: 'hidden',
            transition: 'width 0.2s',
            borderRight: '1px solid',
            borderColor: 'divider',
            top: '48px',
            height: 'calc(100% - 48px)',
          },
        }}
      >
        <List dense>
          {NAV_ITEMS.map(({ label, icon, path }) => (
            <Tooltip key={path} title={open ? '' : label} placement="right">
              <ListItemButton
                selected={pathname === path}
                onClick={() => navigate(path)}
                sx={{ px: 1.5, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                {open && <ListItemText primary={label} />}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Drawer>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '48px',
          p: 3,
          transition: 'margin 0.2s',
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 48px)',
        }}
      >
        {children}
      </Box>

      {/* ── Modal para reconfigurar MFA ── */}
      <Dialog
        open={mfaDialogOpen}
        onClose={() => setMfaDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Reconfigurar Authenticator
        </DialogTitle>
        <DialogContent dividers>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setModalError(null)}>
              {modalError}
            </Alert>
          )}
          {modalSuccess ? (
            <Alert severity="success" sx={{ my: 2 }}>
              ¡MFA reconfigurado exitosamente!
            </Alert>
          ) : (
            mfaModalData && (
              <Box sx={{ mt: 1 }}>
                <MfaQrCard
                  qrCode={mfaModalData.qr_code}
                  manualSecret={mfaModalData.manual_secret}
                  issuer="Dalton AEC IVRS"
                />
                <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Introduce el nuevo código de 6 dígitos:
                </Typography>
                <MfaCodeInput
                  onSubmit={handleVerifyModalMfa}
                  loading={modalLoading}
                  buttonText="Confirmar Nuevo MFA"
                />
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMfaDialogOpen(false)} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
