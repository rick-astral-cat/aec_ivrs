import { Box, Tooltip, Typography } from '@mui/material'
import { STATUS_SERIES, completionPercent, describeRow } from './activityStats'

const SIZE = 120
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // Separación en color de superficie entre segmentos

// Una dona por integrante (small multiples): % completado al centro y los
// segmentos completadas / pendientes / vencidas. Debajo, nombre y conteos en texto.
export default function MemberStatsDonuts({ rows }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 2,
      }}
    >
      {rows.map((row) => (
        <Box key={row.key} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Donut row={row} />
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            title={row.name}
            sx={{ mt: 1, maxWidth: '100%', fontStyle: row.unassigned ? 'italic' : 'normal' }}
          >
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {describeRow(row)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function Donut({ row }) {
  const visible = STATUS_SERIES.filter((s) => row[s.key] > 0)
  const gap = visible.length > 1 ? GAP : 0

  // Largo y posición de inicio de cada segmento a lo largo del círculo.
  const segments = visible.map((s, index) => {
    const before = visible.slice(0, index).reduce((sum, prev) => sum + row[prev.key], 0)
    const length = (row[s.key] / row.total) * CIRCUMFERENCE
    return {
      series: s,
      dash: Math.max(length - gap, 0.5),
      offset: (before / row.total) * CIRCUMFERENCE,
    }
  })

  return (
    <Box sx={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${row.name}: ${describeRow(row)}`}
        style={{ transform: 'rotate(-90deg)' }} // Empieza arriba, en sentido horario
      >
        {/* Pista para quien no tiene actividades */}
        {row.total === 0 && (
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#e6e5e0" strokeWidth={STROKE} />
        )}
        {segments.map(({ series: s, dash, offset }) => (
          <Tooltip key={s.key} title={`${s.label}: ${row[s.key]}`} placement="top" followCursor>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset}
              style={{ cursor: 'default' }}
            />
          </Tooltip>
        ))}
      </svg>

      {/* Centro: % completado y conteo */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {row.total > 0 ? (
          <>
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>{completionPercent(row)}%</Typography>
            <Typography variant="caption" color="text.secondary">{row.done} de {row.total}</Typography>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">—</Typography>
        )}
      </Box>
    </Box>
  )
}
