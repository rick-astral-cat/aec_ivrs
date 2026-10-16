import { useEffect, useState } from 'react'
import {
  Box, Button, Divider, Drawer, IconButton, MenuItem,
  TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'

const NODE_TYPES = [
  { value: 'menu',        label: 'Menú / Submenú' },
  { value: 'timeout',     label: 'Sin dígito (timeout)' },
  { value: 'ring_group',  label: 'Grupo de timbrado' },
  { value: 'ring_single', label: 'Extensión individual' },
  { value: 'voicemail',   label: 'Buzón de voz' },
  { value: 'cadd',        label: 'CADD' },
]

export default function NodeEditor({ node, onChange, onDelete, onDuplicate, onClose }) {
  // Extensiones como texto libre: permite escribir comas sin que el split
  // inmediato las elimine. Se convierte a array solo en onBlur.
  // Los hooks van antes de cualquier return condicional.
  const [extText, setExtText] = useState('')

  useEffect(() => {
    if (!node) return
    const ext = node.data.extensions
    setExtText(Array.isArray(ext) ? ext.join(', ') : (ext ?? ''))
  }, [node?.id])

  if (!node) return null
  const d = node.data
  const set = (field) => (e) => onChange({ ...d, [field]: e.target.value })

  return (
    <Drawer anchor="right" open={!!node} onClose={onClose} variant="persistent"
      sx={{ '& .MuiDrawer-paper': { width: 300, p: 2, top: 48, height: 'calc(100% - 48px)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          Editar nodo
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />

      <TextField select label="Tipo" value={d.type} onChange={set('type')} size="small" fullWidth sx={{ mb: 2 }}>
        {NODE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
      </TextField>

      {(d.type === 'menu') && (
        <>
          <TextField label="Dígito" value={d.digit ?? ''} onChange={set('digit')}
            size="small" fullWidth sx={{ mb: 2 }} inputProps={{ maxLength: 1 }} />
          <TextField label="Etiqueta" value={d.label ?? ''} onChange={set('label')}
            size="small" fullWidth sx={{ mb: 2 }} />
        </>
      )}

      {d.type === 'timeout' && (
        <TextField label="Etiqueta" value={d.label ?? 'Sin dígito'} onChange={set('label')}
          size="small" fullWidth sx={{ mb: 2 }} />
      )}

      {d.type === 'ring_group' && (
        <>
          <TextField
            label="Extensiones (separadas por coma)"
            value={extText}
            onChange={e => setExtText(e.target.value)}
            onBlur={() => {
              const arr = extText.split(',').map(s => s.trim()).filter(Boolean)
              onChange({ ...d, extensions: arr })
              setExtText(arr.join(', '))
            }}
            size="small" fullWidth sx={{ mb: 2 }}
            helperText="Ej: 1001, 1002, 1003" />
          <TextField label="Timbrados (0 = indefinido)" value={d.rings ?? 3}
            onChange={e => onChange({ ...d, rings: Number(e.target.value) })}
            type="number" size="small" fullWidth sx={{ mb: 2 }}
            inputProps={{ min: 0 }} />
        </>
      )}

      {d.type === 'ring_single' && (
        <>
          <TextField label="Extensión" value={d.extension ?? ''} onChange={set('extension')}
            size="small" fullWidth sx={{ mb: 2 }} />
          <TextField label="Timbrados (0 = indefinido)" value={d.rings ?? 5}
            onChange={e => onChange({ ...d, rings: Number(e.target.value) })}
            type="number" size="small" fullWidth sx={{ mb: 2 }}
            inputProps={{ min: 0 }} />
        </>
      )}

      {d.type === 'voicemail' && (
        <TextField
          label="Correo electrónico (opcional)"
          value={d.email ?? ''}
          onChange={set('email')}
          type="email"
          size="small"
          fullWidth
          placeholder="buzon@dalton.com.mx"
          helperText="Correo para notificaciones de buzón"
          sx={{ mb: 2 }}
        />
      )}

      {d.type === 'cadd' && (
        <TextField label="Número destino" value={d.destination ?? ''} onChange={set('destination')}
          size="small" fullWidth sx={{ mb: 2 }} />
      )}

      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={onDuplicate}>
          Duplicar nodo
        </Button>
        <Button fullWidth color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={onDelete}>
          Eliminar nodo
        </Button>
      </Box>
    </Drawer>
  )
}
