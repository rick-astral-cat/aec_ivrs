import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Paper, Tooltip, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  addMember, createActivity, deleteActivity, deleteProject, getProject, removeMember,
  setActivityCompleted, updateActivity, updateMemberRole, updateProject,
} from '../api/projects'
import { getAgencies } from '../api/agencies'
import { displayName } from '../api/users'
import { PERMISSIONS } from '../auth/permissions'
import { useAuth } from '../context/AuthContext'
import { usePermission } from '../hooks/usePermission'
import MarkdownText from '../components/MarkdownText'
import ActivitiesPanel from '../components/projects/ActivitiesPanel'
import ActivityStatsPanel from '../components/projects/ActivityStatsPanel'
import ActivityDialog from '../components/projects/ActivityDialog'
import AddMemberDialog from '../components/projects/AddMemberDialog'
import MembersPanel from '../components/projects/MembersPanel'
import ProjectFormDialog from '../components/projects/ProjectFormDialog'
import { PROJECT_ROLE_LABELS, apiErrorMessage, progressPercent, tagKey } from '../components/projects/projectUtils'

// Detalle de un proyecto de Migración TEAMS: datos generales, avance, integrantes y actividades.
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canReadAgencies = usePermission(PERMISSIONS.AGENCIES_READ)

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [activityDialog, setActivityDialog] = useState({ open: false, activity: null })
  const [agencies, setAgencies] = useState([])

  const reload = useCallback(() => getProject(id).then((r) => setProject(r.data)), [id])

  useEffect(() => {
    getProject(id)
      .then((r) => setProject(r.data))
      .catch((err) => setLoadError(apiErrorMessage(err, 'No se pudo cargar el proyecto.')))
      .finally(() => setLoading(false))
  }, [id])

  // Agencias: sus siglas se sugieren como pills (p. ej. "DHME") y los pills que
  // coinciden con unas siglas muestran el nombre de la agencia y ligan a su IVR.
  useEffect(() => {
    if (!canReadAgencies) return
    getAgencies()
      .then((r) => setAgencies(r.data))
      .catch(() => {})
  }, [canReadAgencies])

  const agenciesByTag = useMemo(
    () => new Map(agencies.filter((a) => a.abbreviation).map((a) => [tagKey(a.abbreviation), a])),
    [agencies],
  )

  // Sugerencias: pills ya usadas en el proyecto primero, luego siglas de agencias.
  const tagSuggestions = useMemo(() => {
    const used = (project?.activities ?? []).flatMap((a) => a.tags)
    const abbreviations = agencies.map((a) => a.abbreviation).filter(Boolean).sort()
    return [...new Set([...used, ...abbreviations])]
  }, [project, agencies])

  // Ejecuta una acción, recarga el proyecto y muestra un mensaje si falla.
  const runAction = async (action, fallback) => {
    setActionError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      setActionError(apiErrorMessage(err, fallback))
    }
  }

  // Para diálogos: propaga el error como Error para que el diálogo lo muestre.
  const submitOrThrow = async (action, fallback) => {
    try {
      await action()
      await reload()
    } catch (err) {
      throw new Error(apiErrorMessage(err, fallback))
    }
  }

  const handleEdit = (data) =>
    submitOrThrow(() => updateProject(id, data), 'No se pudo guardar el proyecto.')
      .then(() => setEditOpen(false))

  const handleDelete = async () => {
    const total = project.activity_count
    const msg = `¿Eliminar el proyecto "${project.name}"` +
      (total ? ` y sus ${total} actividades` : '') +
      '? Los usuarios no se eliminan. Esta acción no se puede deshacer.'
    if (!confirm(msg)) return
    try {
      await deleteProject(id)
      navigate('/teams-migration', { replace: true })
    } catch (err) {
      setActionError(apiErrorMessage(err, 'No se pudo eliminar el proyecto.'))
    }
  }

  const handleAddMember = (userId, role) =>
    submitOrThrow(() => addMember(id, userId, role), 'No se pudo agregar al integrante.')
      .then(() => setAddMemberOpen(false))

  const handleChangeRole = (member, role) =>
    runAction(() => updateMemberRole(id, member.id, role), 'No se pudo cambiar el rol.')

  const handleRemoveMember = (member) => {
    if (!confirm(`¿Quitar a ${displayName(member.user)} del proyecto? Sus actividades quedarán sin encargado.`)) return
    runAction(() => removeMember(id, member.id), 'No se pudo quitar al integrante.')
  }

  const handleSaveActivity = (data) => {
    const { activity } = activityDialog
    const action = activity
      ? () => updateActivity(id, activity.id, data)
      : () => createActivity(id, data)
    return submitOrThrow(action, 'No se pudo guardar la actividad.')
      .then(() => setActivityDialog({ open: false, activity: null }))
  }

  const handleDeleteActivity = (activity) => {
    if (!confirm(`¿Eliminar la actividad "${activity.title}"?`)) return
    runAction(() => deleteActivity(id, activity.id), 'No se pudo eliminar la actividad.')
  }

  const handleToggleActivity = (activity) =>
    runAction(
      () => setActivityCompleted(id, activity.id, !activity.is_completed),
      'No se pudo actualizar la actividad.',
    )

  const backButton = (
    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/teams-migration')} size="small">
      Proyectos
    </Button>
  )

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
  if (loadError) return <Box>{backButton}<Alert severity="error" sx={{ mt: 2 }}>{loadError}</Alert></Box>

  const { name, description, activity_count: total, completed_count: done, can_manage: canManage, my_role: myRole } = project
  const percent = progressPercent(done, total)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {backButton}
        <Box sx={{ flexGrow: 1 }} />
        {myRole && <Chip label={`Tu rol: ${PROJECT_ROLE_LABELS[myRole]}`} size="small" variant="outlined" />}
        {canManage && (
          <>
            <Tooltip title="Editar proyecto">
              <IconButton onClick={() => setEditOpen(true)}><EditIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Eliminar proyecto">
              <IconButton color="error" onClick={handleDelete}><DeleteIcon /></IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* Datos del proyecto y avance */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
        <Typography variant="h5" fontWeight={600}>{name}</Typography>
        {description ? (
          <MarkdownText sx={{ mt: 1, typography: 'body1' }}>{description}</MarkdownText>
        ) : (
          <Typography color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>Sin descripción</Typography>
        )}

        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {total === 0 ? 'Sin actividades' : `${done} de ${total} actividades completadas`}
            </Typography>
            <Typography variant="body2" fontWeight={600}>{percent}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percent}
            color={total > 0 && done === total ? 'success' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      </Paper>

      <MembersPanel
        members={project.members}
        canManage={canManage}
        onAdd={() => setAddMemberOpen(true)}
        onChangeRole={handleChangeRole}
        onRemove={handleRemoveMember}
      />

      <ActivityStatsPanel members={project.members} activities={project.activities} />

      <ActivitiesPanel
        activities={project.activities}
        canManage={canManage}
        currentUserId={user?.id}
        agenciesByTag={agenciesByTag}
        onAdd={() => setActivityDialog({ open: true, activity: null })}
        onEdit={(activity) => setActivityDialog({ open: true, activity })}
        onDelete={handleDeleteActivity}
        onToggle={handleToggleActivity}
      />

      <ProjectFormDialog
        open={editOpen}
        title="Editar proyecto"
        initial={project}
        onSubmit={handleEdit}
        onClose={() => setEditOpen(false)}
      />
      <ActivityDialog
        open={activityDialog.open}
        activity={activityDialog.activity}
        members={project.members}
        tagSuggestions={tagSuggestions}
        onSubmit={handleSaveActivity}
        onClose={() => setActivityDialog({ open: false, activity: null })}
      />
      <AddMemberDialog
        open={addMemberOpen}
        members={project.members}
        onSubmit={handleAddMember}
        onClose={() => setAddMemberOpen(false)}
      />
    </Box>
  )
}
