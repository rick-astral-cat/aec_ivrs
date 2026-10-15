import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Tooltip, Typography,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/Business'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

const DRAWER_FULL = 220
const DRAWER_MINI = 56

const NAV_ITEMS = [
  { label: 'Agencias', icon: <BusinessIcon />, path: '/' },
]

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const drawerWidth = open ? DRAWER_FULL : DRAWER_MINI

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Top bar ── */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" fontWeight={700} letterSpacing={1} noWrap>
            AEC IVRS
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, ml: 1 }} noWrap>
            Dalton IVR Manager
          </Typography>
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
            top: '48px',           // altura de Toolbar dense
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
    </Box>
  )
}
