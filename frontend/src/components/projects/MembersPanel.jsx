import { useState } from 'react'
import {
  Avatar, Box, Button, Chip, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Typography,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import { displayName } from '../../api/users'
import { TEAMS_COLOR } from '../TeamsIcon'
import { PROJECT_ROLE_LABELS, initials } from './projectUtils'

// Sección de integrantes del detalle de proyecto. Con `canManage`, cada pill abre
// un menú para cambiar el rol o quitar al integrante, y aparece "Agregar integrante".
export default function MembersPanel({ members, canManage, onAdd, onChangeRole, onRemove }) {
  const [menu, setMenu] = useState(null) // { anchor, member }

  const closeMenu = () => setMenu(null)
  const owners = members.filter((m) => m.role === 'owner')
  const others = members.filter((m) => m.role !== 'owner')

  const handleRole = (role) => {
    const { member } = menu
    closeMenu()
    onChangeRole(member, role)
  }

  const handleRemove = () => {
    const { member } = menu
    closeMenu()
    onRemove(member)
  }

  const renderChip = (m) => {
    const name = displayName(m.user)
    const isOwner = m.role === 'owner'
    return (
      <Chip
        key={m.id}
        label={name}
        variant={isOwner ? 'filled' : 'outlined'}
        avatar={
          <Avatar sx={{ bgcolor: isOwner ? TEAMS_COLOR : 'grey.400', color: '#fff !important' }}>
            {initials(name)}
          </Avatar>
        }
        onClick={canManage ? (e) => setMenu({ anchor: e.currentTarget, member: m }) : undefined}
      />
    )
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
          INTEGRANTES ({members.length})
        </Typography>
        {canManage && (
          <Button size="small" startIcon={<PersonAddIcon />} onClick={onAdd}>
            Agregar integrante
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary">Líderes</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, mb: 1.5 }}>
        {owners.map(renderChip)}
      </Box>

      <Typography variant="caption" color="text.secondary">Integrantes</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        {others.length ? others.map(renderChip) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            Sin integrantes aún
          </Typography>
        )}
      </Box>

      {canManage && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
          Haz clic en un integrante para cambiar su rol o quitarlo del proyecto.
        </Typography>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu}>
        {menu && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{displayName(menu.member.user)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {PROJECT_ROLE_LABELS[menu.member.role]}
            </Typography>
          </Box>
        )}
        <Divider />
        {menu?.member.role === 'owner' ? (
          <MenuItem onClick={() => handleRole('member')}>
            <ListItemIcon><StarBorderIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Cambiar a integrante</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleRole('owner')}>
            <ListItemIcon><StarIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Hacer líder</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}><PersonRemoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Quitar del proyecto</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  )
}
