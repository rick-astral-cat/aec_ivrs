import { useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, Tab, Tabs,
  TextField, Typography,
} from '@mui/material'
import MarkdownText from '../MarkdownText'

const MARKDOWN_HELP = '**negrita**, *cursiva*, # Título, - lista, 1. lista, - [ ] tarea, [texto](https://…), `código`'

// Diálogo para crear o editar un proyecto (nombre y descripción).
// `onSubmit({ name, description })` debe devolver una promesa; si falla, el
// diálogo muestra `error` y permanece abierto.
export default function ProjectFormDialog({ open, title, initial, submitLabel = 'Guardar', onSubmit, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* El formulario se monta al abrir, así toma los valores iniciales actuales */}
      {open && (
        <ProjectForm
          title={title}
          initial={initial}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

function ProjectForm({ title, initial, submitLabel, onSubmit, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [descriptionTab, setDescriptionTab] = useState('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || null })
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el proyecto.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Nombre del proyecto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          fullWidth
          placeholder="Ej. Extracción de IVRs Dalton"
        />
        {/* Descripción en Markdown: pestaña para escribir y otra para la vista previa */}
        <Box>
          <Tabs
            value={descriptionTab}
            onChange={(_, value) => setDescriptionTab(value)}
            sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
          >
            <Tab value="write" label="Escribir" />
            <Tab value="preview" label="Vista previa" />
          </Tabs>
          {descriptionTab === 'write' ? (
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={5}
              maxRows={16}
              placeholder="Objetivo, alcance o notas del proyecto"
              helperText={
                <>
                  Admite{' '}
                  <Link href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noopener noreferrer">
                    Markdown
                  </Link>
                  : {MARKDOWN_HELP}
                </>
              }
            />
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                minHeight: 134,
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              {description.trim() ? (
                <MarkdownText>{description}</MarkdownText>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">Nada que mostrar todavía.</Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  )
}
