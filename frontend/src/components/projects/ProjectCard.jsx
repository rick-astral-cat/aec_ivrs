import { Box, Card, CardActionArea, Chip, LinearProgress, Typography } from '@mui/material'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import { TEAMS_COLOR } from '../TeamsIcon'
import MemberChips from './MemberChips'
import { PROJECT_ROLE_LABELS, progressPercent } from './projectUtils'
import { markdownToPlainText } from '../markdownUtils'

// Limita un texto a N líneas con "..." al final.
const clampLines = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

// Tarjeta de proyecto estilo Classroom: encabezado de color con el título,
// resumen de actividades, barra de avance y pills de integrantes.
export default function ProjectCard({ project, onOpen }) {
  const { name, description, activity_count: total, completed_count: done, members, my_role: myRole } = project
  const percent = progressPercent(done, total)
  const finished = total > 0 && done === total

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
      }}
    >
      <CardActionArea
        onClick={onOpen}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {/* Encabezado */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            minHeight: 88,
            color: '#fff',
            background: `linear-gradient(135deg, ${TEAMS_COLOR} 0%, #444791 100%)`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={600} lineHeight={1.25} sx={clampLines(2)}>
            {name}
          </Typography>
          {myRole && (
            <Chip
              label={PROJECT_ROLE_LABELS[myRole] || myRole}
              size="small"
              sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', height: 20 }}
            />
          )}
        </Box>

        {/* Cuerpo */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ...clampLines(2), minHeight: '2.86em', fontStyle: description ? 'normal' : 'italic' }}
          >
            {markdownToPlainText(description) || 'Sin descripción'}
          </Typography>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TaskAltIcon fontSize="small" color={finished ? 'success' : 'action'} />
                <Typography variant="body2">
                  {total === 0 ? 'Sin actividades' : `${done} de ${total} actividades`}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} color={finished ? 'success.main' : 'text.primary'}>
                {percent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percent}
              color={finished ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Box sx={{ mt: 'auto' }}>
            <MemberChips members={members} max={4} />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  )
}
