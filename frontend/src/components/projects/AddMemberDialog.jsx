import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Radio, RadioGroup, TextField, Typography,
} from '@mui/material'
import { displayName, getUsers } from '../../api/users'
import { PROJECT_ROLE_LABELS } from './projectUtils'

// Modal para agregar un usuario de la app como integrante del proyecto.
// `onSubmit(userId, role)` debe devolver una promesa; si falla con Error, se muestra el mensaje.
export default function AddMemberDialog({ open, members, onSubmit, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && <AddMemberForm members={members} onSubmit={onSubmit} onClose={onClose} />}
    </Dialog>
  )
}

function AddMemberForm({ members, onSubmit, onClose }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getUsers()
      .then((r) => setUsers(r.data))
      .catch(() => setError('No se pudo cargar la lista de usuarios.'))
      .finally(() => setLoadingUsers(false))
  }, [])

  // Solo usuarios que aún no son integrantes.
  const available = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.user.id))
    return users.filter((u) => !memberIds.has(u.id))
  }, [users, members])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(user.id, role)
    } catch (err) {
      setError(err?.message || 'No se pudo agregar al integrante.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>Agregar integrante</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Autocomplete
          options={available}
          value={user}
          onChange={(_, value) => setUser(value)}
          loading={loadingUsers}
          getOptionLabel={(u) => displayName(u)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderOption={(props, u) => {
            const { key, ...rest } = props
            return (
              <li key={key} {...rest}>
                <span>
                  {displayName(u)}
                  {u.full_name && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      @{u.username}
                    </Typography>
                  )}
                </span>
              </li>
            )
          }}
          noOptionsText={loadingUsers ? 'Cargando…' : 'Todos los usuarios ya son integrantes'}
          renderInput={(params) => <TextField {...params} label="Usuario" autoFocus required />}
        />
        <RadioGroup row value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => (
            <FormControlLabel key={value} value={value} control={<Radio size="small" />} label={label} />
          ))}
        </RadioGroup>
        <Typography variant="caption" color="text.secondary">
          Los líderes administran el proyecto, sus integrantes y actividades. Los integrantes
          pueden ver el proyecto y completar las actividades que tengan asignadas.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !user}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Agregar
        </Button>
      </DialogActions>
    </form>
  )
}
