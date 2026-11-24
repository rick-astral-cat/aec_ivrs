import { useMemo, useState } from 'react'
import { Box, Paper, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import BarChartIcon from '@mui/icons-material/BarChart'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import MemberStatsBars from './MemberStatsBars'
import MemberStatsDonuts from './MemberStatsDonuts'
import { STATUS_SERIES, buildMemberStats } from './activityStats'

const VIEW_STORAGE_KEY = 'aec.projectStats.view'

// La vista elegida (barras o donas) se recuerda en este navegador.
function readStoredView() {
  try {
    const value = localStorage.getItem(VIEW_STORAGE_KEY)
    return value === 'donuts' ? 'donuts' : 'bars'
  } catch {
    return 'bars'
  }
}

function storeView(view) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    // Sin almacenamiento disponible: solo se pierde la preferencia.
  }
}

// Gráficas de avance por integrante, con switch entre barras apiladas y donas.
// No se muestra si el proyecto aún no tiene actividades.
export default function ActivityStatsPanel({ members, activities }) {
  const [view, setView] = useState(readStoredView)
  const rows = useMemo(() => buildMemberStats(members, activities), [members, activities])

  if (activities.length === 0) return null

  const handleView = (_, value) => {
    if (!value) return
    setView(value)
    storeView(value)
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
          AVANCE POR INTEGRANTE
        </Typography>

        {/* Leyenda: muestra de color + texto (el color nunca va solo) */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {STATUS_SERIES.map((s) => (
            <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Box>
          ))}
        </Box>

        <ToggleButtonGroup size="small" exclusive value={view} onChange={handleView} aria-label="Tipo de gráfica">
          <ToggleButton value="bars" aria-label="Barras">
            <Tooltip title="Barras"><BarChartIcon fontSize="small" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="donuts" aria-label="Donas">
            <Tooltip title="Donas"><DonutLargeIcon fontSize="small" /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'donuts' ? <MemberStatsDonuts rows={rows} /> : <MemberStatsBars rows={rows} />}

      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>
        Vencidas: pendientes cuya fecha propuesta ya pasó.
      </Typography>
    </Paper>
  )
}
