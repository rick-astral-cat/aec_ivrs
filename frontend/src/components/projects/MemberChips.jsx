import { Avatar, Box, Chip, Tooltip } from '@mui/material'
import { displayName } from '../../api/users'
import { TEAMS_COLOR } from '../TeamsIcon'
import { PROJECT_ROLE_LABELS, initials } from './projectUtils'

// Pills con los integrantes de un proyecto. Muestra hasta `max` y agrupa el resto
// en un chip "+N" con la lista completa en el tooltip.
export default function MemberChips({ members, max = 4, size = 'small' }) {
  if (!members?.length) return null

  const visible = members.slice(0, max)
  const hidden = members.slice(max)

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {visible.map((m) => {
        const name = displayName(m.user)
        const isOwner = m.role === 'owner'
        return (
          <Tooltip key={m.id} title={`${name} · ${PROJECT_ROLE_LABELS[m.role] || m.role}`}>
            <Chip
              size={size}
              label={name}
              variant={isOwner ? 'filled' : 'outlined'}
              avatar={
                <Avatar sx={{ bgcolor: isOwner ? TEAMS_COLOR : 'grey.400', color: '#fff !important' }}>
                  {initials(name)}
                </Avatar>
              }
            />
          </Tooltip>
        )
      })}
      {hidden.length > 0 && (
        <Tooltip title={hidden.map((m) => displayName(m.user)).join(', ')}>
          <Chip size={size} label={`+${hidden.length}`} variant="outlined" />
        </Tooltip>
      )}
    </Box>
  )
}
