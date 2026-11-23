import { useState } from 'react'
import {
  Alert, Autocomplete, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, TextField,
} from '@mui/material'
import { displayName } from '../../api/users'

// Modal para crear o editar una actividad: nombre, encargado (integrante del
// proyecto) y pills libres para categorías o datos (p. ej. siglas de agencia).
// `tagSuggestions` se ofrecen en el autocompletado, pero se puede escribir cualquier pill.
export default function ActivityDialog({ open, activity, members, tagSuggestions, onSubmit, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <ActivityForm
          activity={activity}
          members={members}
          tagSuggestions={tagSuggestions}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

function ActivityForm({ activity, members, tagSuggestions, onSubmit, onClose }) {
  const isEdit = Boolean(activity)
  const [title, setTitle] = useState(activity?.title ?? '')
  const [assigneeId, setAssigneeId] = useState(activity?.assignee?.id ?? '')
  const [tags, setTags] = useState(activity?.tags ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        assignee_id: assigneeId === '' ? null : assigneeId,
        tags,
      })
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la actividad.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{isEdit ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Actividad"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          fullWidth
          placeholder="Ej. Extraer IVR de AEC de Honda Mariano Escobedo"
        />
        <TextField
          select
          label="Encargado"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          fullWidth
          helperText="Solo integrantes del proyecto"
        >
          <MenuItem value=""><em>Sin encargado</em></MenuItem>
          {members.map((m) => (
            <MenuItem key={m.user.id} value={m.user.id}>{displayName(m.user)}</MenuItem>
          ))}
        </TextField>
        <Autocomplete
          multiple
          freeSolo
          options={tagSuggestions}
          value={tags}
          onChange={(_, value) => setTags(normalizeTags(value))}
          renderValue={(value, getItemProps) =>
            value.map((tag, index) => {
              const { key, ...itemProps } = getItemProps({ index })
              return <Chip key={key} label={tag} size="small" {...itemProps} />
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Pills"
              placeholder={tags.length ? '' : 'Ej. DHME — escribe y presiona Enter'}
              helperText="Categorías o datos clave. Se sugieren las siglas de las agencias."
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !title.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isEdit ? 'Guardar' : 'Agregar'}
        </Button>
      </DialogActions>
    </form>
  )
}

// Igual que el backend: recorta, compacta espacios y quita duplicados sin importar mayúsculas.
function normalizeTags(values) {
  const seen = new Set()
  const result = []
  for (const raw of values) {
    const tag = String(raw).trim().replace(/\s+/g, ' ')
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase())
      result.push(tag)
    }
  }
  return result
}
