import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

// Detalle de un proyecto de Migración TEAMS (integrantes y actividades se agregan después).
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/teams-migration')} size="small">
        Proyectos
      </Button>
      <Typography variant="h5" fontWeight={600} sx={{ mt: 2 }}>Proyecto #{id}</Typography>
    </Box>
  )
}
