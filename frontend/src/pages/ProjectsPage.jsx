import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Grid, Paper, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TeamsIcon from '../components/TeamsIcon'
import ProjectCard from '../components/projects/ProjectCard'
import ProjectFormDialog from '../components/projects/ProjectFormDialog'
import { apiErrorMessage } from '../components/projects/projectUtils'
import { createProject, getProjects } from '../api/projects'
import { PERMISSIONS } from '../auth/permissions'
import { usePermission } from '../hooks/usePermission'

// Grid de proyectos de Migración TEAMS (estilo Classroom).
export default function ProjectsPage() {
  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.PROJECTS_CREATE)

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    getProjects()
      .then((r) => setProjects(r.data))
      .catch(() => setError('No se pudieron cargar los proyectos.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (data) => {
    try {
      const { data: project } = await createProject(data)
      navigate(`/teams-migration/${project.id}`)
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'No se pudo crear el proyecto.'))
    }
  }

  const openDialog = () => setDialogOpen(true)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <TeamsIcon />
        <Typography variant="h5" fontWeight={600} sx={{ flexGrow: 1 }}>Migración TEAMS</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            Nuevo proyecto
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
      ) : projects.length === 0 && !error ? (
        <Paper
          elevation={0}
          sx={{ border: '1px dashed', borderColor: 'divider', p: 6, textAlign: 'center' }}
        >
          <TeamsIcon sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6" gutterBottom>Aún no hay proyectos</Typography>
          <Typography color="text.secondary" sx={{ mb: canCreate ? 2 : 0 }}>
            {canCreate
              ? 'Crea el primer proyecto de migración para organizar actividades y responsables.'
              : 'Cuando un líder te agregue a un proyecto, aparecerá aquí.'}
          </Typography>
          {canCreate && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openDialog}>
              Nuevo proyecto
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid key={project.id} size={{ xs: 12, sm: 6, md: 4, xl: 3 }}>
              <ProjectCard project={project} onOpen={() => navigate(`/teams-migration/${project.id}`)} />
            </Grid>
          ))}
        </Grid>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        title="Nuevo proyecto"
        submitLabel="Crear proyecto"
        onSubmit={handleCreate}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  )
}
