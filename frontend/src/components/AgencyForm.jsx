import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accordion, AccordionSummary, AccordionDetails,
  Box, Button, Chip, Divider, FormControlLabel, Grid, IconButton,
  Paper, Stack, Switch, TextField, Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import CheckIcon from '@mui/icons-material/Check'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlineOutlined'
import { DAYS, emptySchedule, parseSchedule, serializeSchedule } from './scheduleUtils'

const EMPTY_RANGE = { from: '', to: '' }

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
    // Normalizar a solo dígitos por si vinieran con separadores
    return { from: from.replace(/\D/g, ''), to: to.replace(/\D/g, '') }
  })
}

const serializeRanges = (ranges) =>
  ranges.filter(r => r.from || r.to).map(r => `${r.from}-${r.to}`).join(' | ')

// Deja solo dígitos y recorta a máximo 10 (número telefónico mexicano).
const onlyDigits = (str) => (str ?? '').replace(/\D/g, '').slice(0, 10)

// Formatea visualmente a "XX-XXXX-XXXX" a partir de dígitos crudos.
// Se adapta mientras se escribe: "33" → "33", "332834" → "33-2834",
// "3328341462" → "33-2834-1462". No afecta el dato guardado (siempre dígitos).
const formatPhone = (digits) => {
  const d = onlyDigits(digits)
  if (d.length <= 2) return d
  if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
}

export default function AgencyForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY)
  const [ranges, setRanges] = useState([{ ...EMPTY_RANGE }])
  const [schedule, setSchedule] = useState(emptySchedule())
  const [saveSuccess, setSaveSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const base = { ...EMPTY, ...initial }
    setForm(base)
    setRanges(parseRanges(initial?.phone_ranges))
    setSchedule(parseSchedule(initial?.business_hours))
  }, [initial])

  const set = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Guarda solo dígitos (sin guiones). El formato visual se aplica al renderizar.
  // Esto cubre tanto escritura manual como copy/paste: cualquier guion o símbolo
  // que venga en el texto pegado se elimina automáticamente.
  const setRange = (i, field) => (e) =>
    setRanges(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: onlyDigits(e.target.value) } : r))

  const addRange = () => setRanges(rs => [...rs, { ...EMPTY_RANGE }])
  const removeRange = (i) => setRanges(rs => rs.filter((_, idx) => idx !== i))

  // ── Manejo de segmentos de horario por día ──
  const addSegment = (dayKey) =>
    setSchedule(s => ({ ...s, [dayKey]: [...s[dayKey], ['', '']] }))

  const removeSegment = (dayKey, idx) =>
    setSchedule(s => ({ ...s, [dayKey]: s[dayKey].filter((_, i) => i !== idx) }))

  const setSegment = (dayKey, idx, pos) => (e) =>
    setSchedule(s => ({
      ...s,
      [dayKey]: s[dayKey].map((seg, i) =>
        i === idx ? (pos === 'start' ? [e.target.value, seg[1]] : [seg[0], e.target.value]) : seg
      ),
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await onSubmit({
      ...form,
      phone_ranges: serializeRanges(ranges),
      business_hours: serializeSchedule(schedule),
    })
    // Mostrar feedback de éxito solo si el guardado fue exitoso
    if (ok !== false) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
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
        <Button
          type="submit"
          variant="contained"
          color={saveSuccess ? 'success' : 'primary'}
          startIcon={saveSuccess ? <CheckIcon /> : <SaveIcon />}
          disabled={loading}
        >
          {saveSuccess ? '¡Guardado!' : 'Guardar'}
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
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
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
          <Grid container spacing={2} key={i} sx={{ mb: 1, alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Número inicio"
                value={formatPhone(r.from)} onChange={setRange(i, 'from')}
                fullWidth size="small" required
                placeholder="33-2834-1462"
                slotProps={{ htmlInput: { maxLength: 12, inputMode: 'numeric' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Número final"
                value={formatPhone(r.to)} onChange={setRange(i, 'to')}
                fullWidth size="small" required
                placeholder="33-2834-1497"
                slotProps={{ htmlInput: { maxLength: 12, inputMode: 'numeric' } }}
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

        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={form.has_schedule} onChange={set('has_schedule')} />}
              label="La agencia tiene horario de atención (fuera de horario activo)"
            />
          </Grid>

          {form.has_schedule && (
            <>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Define los segmentos de atención por día. Puedes agregar varios rangos
                  (ej: mañana y tarde) en cada día. Los días sin segmentos se consideran cerrados.
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                {DAYS.map(({ key, label }) => {
                  const segs = schedule[key] ?? []
                  return (
                    <Accordion key={key} disableGutters elevation={0}
                      sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography sx={{ fontWeight: 500, minWidth: 90 }}>{label}</Typography>
                          {segs.length === 0
                            ? <Chip label="Cerrado" size="small" variant="outlined" />
                            : <Chip label={`${segs.length} segmento${segs.length > 1 ? 's' : ''}`}
                                size="small" color="success" variant="outlined" />}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1.5}>
                          {segs.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Sin horario este día.
                            </Typography>
                          )}
                          {segs.map((seg, idx) => (
                            <Grid container spacing={1} key={idx} sx={{ alignItems: 'center' }}>
                              <Grid size={{ xs: 5 }}>
                                <TextField
                                  label="Inicio" type="time" size="small" fullWidth
                                  value={seg[0]}
                                  onChange={setSegment(key, idx, 'start')}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 5 }}>
                                <TextField
                                  label="Fin" type="time" size="small" fullWidth
                                  value={seg[1]}
                                  onChange={setSegment(key, idx, 'end')}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <IconButton color="error" size="small"
                                  onClick={() => removeSegment(key, idx)}>
                                  <RemoveCircleOutlineIcon />
                                </IconButton>
                              </Grid>
                            </Grid>
                          ))}
                          <Box>
                            <Button size="small" startIcon={<AddIcon />}
                              onClick={() => addSegment(key)}>
                              Agregar segmento
                            </Button>
                          </Box>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  )
                })}
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
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
