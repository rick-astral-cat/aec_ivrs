import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Divider, FormControlLabel, Grid, IconButton,
  Paper, Switch, TextField, Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlineOutlined'

const EMPTY_RANGE = { from: '', to: '' }
const EMPTY_HOURS = { start: '', end: '' }

const EMPTY = {
  name: '',
  abbreviation: '',
  region: '',
  has_schedule: false,
  after_hours_mailbox: '',
}

// Parsea "3344363000-3344363097 | 3344505000-3344505097" → [{ from, to }]
const parseRanges = (str) => {
  if (!str) return [{ ...EMPTY_RANGE }]
  return str.split('|').map(r => {
    const [from = '', to = ''] = r.trim().split('-')
    return { from: from.trim(), to: to.trim() }
  })
}

// Parsea "07:00-19:00" → { start, end }
const parseHours = (str) => {
  if (!str) return { ...EMPTY_HOURS }
  const [start = '', end = ''] = str.split('-')
  return { start: start.trim(), end: end.trim() }
}

const serializeRanges = (ranges) =>
  ranges.filter(r => r.from || r.to).map(r => `${r.from}-${r.to}`).join(' | ')

const serializeHours = (h) => (h.start || h.end) ? `${h.start}-${h.end}` : ''

export default function AgencyForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY)
  const [ranges, setRanges] = useState([{ ...EMPTY_RANGE }])
  const [hours, setHours] = useState({ ...EMPTY_HOURS })
  const navigate = useNavigate()

  useEffect(() => {
    const base = { ...EMPTY, ...initial }
    setForm(base)
    setRanges(parseRanges(initial?.phone_ranges))
    setHours(parseHours(initial?.business_hours))
  }, [initial])

  const set = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const setRange = (i, field) => (e) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: e.target.value } : r))

  const addRange = () => setRanges(rs => [...rs, { ...EMPTY_RANGE }])
  const removeRange = (i) => setRanges(rs => rs.filter((_, idx) => idx !== i))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      phone_ranges: serializeRanges(ranges),
      business_hours: serializeHours(hours),
    })
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} size="small">
          Agencias
        </Button>
        <Typography variant="h5" fontWeight={600} sx={{ flexGrow: 1 }}>
          {form.name || 'Nueva agencia'}
        </Typography>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
          Guardar
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          DATOS GENERALES
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Nombre de la agencia"
              value={form.name} onChange={set('name')}
              required fullWidth size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              label="Abreviatura"
              value={form.abbreviation} onChange={set('abbreviation')}
              required fullWidth size="small"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField
              label="Región"
              value={form.region} onChange={set('region')}
              required fullWidth size="small"
            />
          </Grid>
        </Grid>

        {/* ── Rangos de teléfono ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
            RANGOS DE TELÉFONO
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addRange}>
            Agregar rango
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {ranges.map((r, i) => (
          <Grid container spacing={2} key={i} sx={{ mb: 1 }} alignItems="center">
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Número inicio (10 dígitos)"
                value={r.from} onChange={setRange(i, 'from')}
                fullWidth size="small" required
                inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Número final (10 dígitos)"
                value={r.to} onChange={setRange(i, 'to')}
                fullWidth size="small" required
                inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton
                color="error" size="small"
                onClick={() => removeRange(i)}
                disabled={ranges.length === 1}
              >
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        {/* ── Horario de atención ── */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
          HORARIO DE ATENCIÓN
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={form.has_schedule} onChange={set('has_schedule')} />}
              label="La agencia tiene horario de atención (fuera de horario activo)"
            />
          </Grid>
          {form.has_schedule && (
            <>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Hora inicio"
                  type="time" size="small" fullWidth
                  value={hours.start}
                  onChange={e => setHours(h => ({ ...h, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Hora fin"
                  type="time" size="small" fullWidth
                  value={hours.end}
                  onChange={e => setHours(h => ({ ...h, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Buzón fuera de horario"
                  value={form.after_hours_mailbox} onChange={set('after_hours_mailbox')}
                  fullWidth size="small"
                  placeholder="fuerahorario_bydc@dalton.com.mx"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    </Box>
  )
}
