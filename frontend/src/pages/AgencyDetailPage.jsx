import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, CircularProgress } from '@mui/material'
import AgencyForm from '../components/AgencyForm'
import IVRBuilder from '../components/IVRBuilder'
import IVRDiagram from '../components/IVRDiagram'
import { createAgency, getAgency, updateAgency } from '../api/agencies'

export default function AgencyDetailPage() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [initial, setInitial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isNew) { setInitial(null); setLoading(false); return }
    getAgency(id)
      .then(r => setInitial(r.data))
      .catch(() => setError('No se pudo cargar la agencia'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (form) => {
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const { data } = await createAgency(form)
        navigate(`/agencies/${data.id}`, { replace: true })
      } else {
        const updated = await updateAgency(id, { ...initial, ...form })
        setInitial(updated.data)
      }
    } catch {
      setError('Error al guardar. Verifica los datos e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIVR = async (tree) => {
    try {
      const updated = await updateAgency(id, { ...initial, ivr: tree })
      setInitial(updated.data)
    } catch {
      setError('Error al guardar el IVR.')
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>

  return (
    <Box>
      <AgencyForm initial={initial} onSubmit={handleSubmit} loading={saving} />
      {!isNew && <IVRBuilder ivr={initial?.ivr} agencyName={initial?.name} onSave={handleSaveIVR} />}
      {!isNew && <IVRDiagram ivr={initial?.ivr} agencyName={initial?.name} agency={initial} />}
    </Box>
  )
}
