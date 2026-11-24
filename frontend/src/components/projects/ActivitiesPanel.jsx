import { useMemo, useState } from 'react'
import {
  Avatar, Box, Button, Checkbox, Chip, Divider, FormControlLabel, IconButton, Paper, Switch,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddTaskIcon from '@mui/icons-material/AddTask'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ScheduleIcon from '@mui/icons-material/Schedule'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { displayName } from '../../api/users'
import { TEAMS_COLOR } from '../TeamsIcon'
import { completedLate, dueStatus, formatDateOnly, formatDateTime, initials } from './projectUtils'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'done', label: 'Completadas' },
]

// Apariencia del chip de fecha propuesta según su estado.
const DUE_STYLES = {
  overdue: { color: 'error', variant: 'filled', prefix: 'Vencida · ' },
  today: { color: 'warning', variant: 'filled', prefix: 'Hoy · ' },
  upcoming: { color: 'default', variant: 'outlined', prefix: 'Para el ' },
}

// Lista de actividades del proyecto con filtros, checkbox de completado,
// encargado y pills. Los líderes pueden agregar, editar y eliminar; el encargado
// solo puede marcar como completadas sus propias actividades.
export default function ActivitiesPanel({
  activities, canManage, currentUserId, onAdd, onEdit, onDelete, onToggle,
}) {
  const [status, setStatus] = useState('all')
  const [onlyMine, setOnlyMine] = useState(false)

  const done = activities.filter((a) => a.is_completed).length
  const mineCount = activities.filter((a) => a.assignee?.id === currentUserId).length

  const visible = useMemo(() => activities.filter((a) => {
    if (status === 'pending' && a.is_completed) return false
    if (status === 'done' && !a.is_completed) return false
    if (onlyMine && a.assignee?.id !== currentUserId) return false
    return true
  }), [activities, status, onlyMine, currentUserId])

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
          ACTIVIDADES ({done}/{activities.length})
        </Typography>
        {canManage && (
          <Button size="small" variant="contained" startIcon={<AddTaskIcon />} onClick={onAdd}>
            Agregar actividad
          </Button>
        )}
      </Box>

      {activities.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={status}
            onChange={(_, value) => value && setStatus(value)}
          >
            {STATUS_FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value} sx={{ textTransform: 'none', px: 1.5 }}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {mineCount > 0 && (
            <FormControlLabel
              control={<Switch size="small" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />}
              label={<Typography variant="body2">Solo mis actividades ({mineCount})</Typography>}
            />
          )}
        </Box>
      )}

      {activities.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ py: 2 }}>
          {canManage
            ? 'Aún no hay actividades. Agrega la primera y asígnale un encargado.'
            : 'Aún no hay actividades en este proyecto.'}
        </Typography>
      ) : visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ py: 2 }}>
          No hay actividades con este filtro.
        </Typography>
      ) : (
        <Box>
          {visible.map((a, index) => (
            <Box key={a.id}>
              {index > 0 && <Divider />}
              <ActivityRow
                activity={a}
                canManage={canManage}
                canToggle={canManage || a.assignee?.id === currentUserId}
                onEdit={() => onEdit(a)}
                onDelete={() => onDelete(a)}
                onToggle={() => onToggle(a)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

function ActivityRow({ activity, canManage, canToggle, onEdit, onDelete, onToggle }) {
  const {
    title, tags, due_date: dueDate, is_completed: completed,
    assignee, completed_by: completedBy, completed_at: completedAt,
  } = activity
  const assigneeName = assignee ? displayName(assignee) : null
  const dueStyle = DUE_STYLES[dueStatus(dueDate, completed)] ?? DUE_STYLES.upcoming
  const late = completed && completedLate(dueDate, completedAt)

  const checkbox = (
    <Checkbox
      checked={completed}
      onChange={onToggle}
      disabled={!canToggle}
      color="success"
      sx={{ mt: -0.5 }}
    />
  )

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1.25 }}>
      <Tooltip
        title={
          completed
            ? `Completada${completedBy ? ` por ${displayName(completedBy)}` : ''}${completedAt ? ` · ${formatDateTime(completedAt)}` : ''}`
            : canToggle ? 'Marcar como completada' : 'Solo el encargado o un líder puede completarla'
        }
      >
        <span>{checkbox}</span>
      </Tooltip>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            textDecoration: completed ? 'line-through' : 'none',
            color: completed ? 'text.secondary' : 'text.primary',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          {assigneeName ? (
            <Chip
              size="small"
              variant="outlined"
              label={assigneeName}
              avatar={<Avatar sx={{ bgcolor: TEAMS_COLOR, color: '#fff !important' }}>{initials(assigneeName)}</Avatar>}
            />
          ) : (
            <Chip size="small" variant="outlined" label="Sin encargado" sx={{ fontStyle: 'italic' }} />
          )}
          {dueDate && (
            <Tooltip title="Fecha propuesta (la define un líder)">
              <Chip
                size="small"
                icon={<ScheduleIcon />}
                color={completed ? 'default' : dueStyle.color}
                variant={completed ? 'outlined' : dueStyle.variant}
                label={`${completed ? 'Para el ' : dueStyle.prefix}${formatDateOnly(dueDate)}`}
              />
            </Tooltip>
          )}
          {completed && completedAt && (
            <Tooltip
              title={`Última vez marcada como completada${completedBy ? ` por ${displayName(completedBy)}` : ''}` +
                (late ? ' · después de la fecha propuesta' : '')}
            >
              <Chip
                size="small"
                icon={<TaskAltIcon />}
                color={late ? 'warning' : 'success'}
                variant="outlined"
                label={`Completada ${formatDateTime(completedAt)}`}
              />
            </Tooltip>
          )}
          {tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} color="primary" variant="outlined" />
          ))}
        </Box>
      </Box>

      {canManage && (
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}
