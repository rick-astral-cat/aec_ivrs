import { Box, Typography } from '@mui/material'
import TeamsIcon from '../components/TeamsIcon'

// Página de proyectos de Migración TEAMS (el grid de tarjetas se agrega después).
export default function ProjectsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <TeamsIcon />
        <Typography variant="h5" fontWeight={600}>Migración TEAMS</Typography>
      </Box>
      <Typography color="text.secondary">Próximamente: proyectos de migración.</Typography>
    </Box>
  )
}
