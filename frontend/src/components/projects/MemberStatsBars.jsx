import { Box, Tooltip, Typography } from '@mui/material'
import { STATUS_SERIES, completionPercent, describeRow } from './activityStats'

const BAR_HEIGHT = 20 // Barras delgadas (≤ 24px)
const GAP = 2 // Separación en color de superficie entre segmentos

// Barras horizontales apiladas: una por integrante. El largo es su total de
// actividades (escala común) y los segmentos son completadas / pendientes / vencidas.
export default function MemberStatsBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.total))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {rows.map((row) => (
        <Box
          key={row.key}
          sx={{
            display: 'grid',
            // En pantallas angostas la barra baja debajo del nombre.
            gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(120px, 180px) 1fr auto' },
            gridTemplateAreas: { xs: '"name figure" "bar bar"', sm: '"name bar figure"' },
            alignItems: 'center',
            columnGap: 1.5,
            rowGap: 0.5,
          }}
        >
          <Typography
            variant="body2"
            noWrap
            title={row.name}
            sx={{ gridArea: 'name', fontStyle: row.unassigned ? 'italic' : 'normal' }}
          >
            {row.name}
          </Typography>

          <Box sx={{ gridArea: 'bar', minWidth: 0 }}>
            {row.total === 0 ? (
              <Typography variant="caption" color="text.secondary" fontStyle="italic">Sin actividades</Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: `${GAP}px`, width: `${(row.total / max) * 100}%`, minWidth: 8 }}>
                {STATUS_SERIES.filter((s) => row[s.key] > 0).map((s, index, visible) => (
                  <Tooltip key={s.key} title={`${row.name} · ${s.label}: ${row[s.key]}`} placement="top">
                    <Box
                      sx={{
                        flexGrow: row[s.key],
                        flexBasis: 0,
                        height: BAR_HEIGHT,
                        bgcolor: s.color,
                        // Base cuadrada a la izquierda; extremo de datos redondeado.
                        borderTopRightRadius: index === visible.length - 1 ? 4 : 0,
                        borderBottomRightRadius: index === visible.length - 1 ? 4 : 0,
                        cursor: 'default',
                        '&:hover': { filter: 'brightness(1.1)' },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            )}
          </Box>

          <Tooltip title={describeRow(row)}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ gridArea: 'figure', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
            >
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {row.done}/{row.total}
              </Box>
              {row.total > 0 && ` · ${completionPercent(row)}%`}
            </Typography>
          </Tooltip>
        </Box>
      ))}
    </Box>
  )
}
