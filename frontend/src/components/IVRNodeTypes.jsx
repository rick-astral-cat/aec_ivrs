import { Handle, Position } from '@xyflow/react'
import { Box, Chip, Typography } from '@mui/material'
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import TimerOffIcon from '@mui/icons-material/TimerOff'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import VoicemailIcon from '@mui/icons-material/Voicemail'
import CallSplitIcon from '@mui/icons-material/CallSplit'

const STYLES = {
  menu:        { color: '#1565C0', bg: '#E3F2FD', icon: <MenuBookIcon fontSize="small" /> },
  timeout:     { color: '#6A1B9A', bg: '#F3E5F5', icon: <TimerOffIcon fontSize="small" /> },
  ring_group:  { color: '#2E7D32', bg: '#E8F5E9', icon: <GroupIcon fontSize="small" /> },
  ring_single: { color: '#E65100', bg: '#FFF3E0', icon: <PersonIcon fontSize="small" /> },
  voicemail:   { color: '#4E342E', bg: '#EFEBE9', icon: <VoicemailIcon fontSize="small" /> },
  cadd:        { color: '#C62828', bg: '#FFEBEE', icon: <PhoneForwardedIcon fontSize="small" /> },
}

const LABELS = {
  menu: 'Menú',
  timeout: 'Sin dígito',
  ring_group: 'Grupo timbrado',
  ring_single: 'Extensión',
  voicemail: 'Buzón',
  cadd: 'CADD',
}

function NodeShell({ data, children }) {
  const s = STYLES[data.type] ?? STYLES.menu
  return (
    <Box sx={{
      border: `2px solid ${s.color}`,
      borderRadius: 2,
      bgcolor: s.bg,
      p: 1,
      width: 220,          // ancho fijo para que los edges se anclen siempre al mismo punto
      boxSizing: 'border-box',
      overflow: 'hidden',  // evita que el contenido rompa el borde del nodo
      fontSize: 12,
      cursor: 'grab',
    }}>
      <Handle type="target" position={Position.Top} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Box sx={{ color: s.color, display: 'flex', flexShrink: 0 }}>{s.icon}</Box>
        <Chip label={LABELS[data.type]} size="small"
          sx={{ bgcolor: s.color, color: '#fff', height: 18, fontSize: 10 }} />
      </Box>
      {children}
      <Handle type="source" position={Position.Bottom} />
    </Box>
  )
}

function Line({ label, value }) {
  if (!value && value !== 0) return null
  const text = Array.isArray(value) ? value.join(', ') : String(value)
  return (
    <Typography
      variant="caption"
      display="block"
      sx={{
        lineHeight: 1.4,
        wordBreak: 'break-word',   // rompe palabras largas (ej: extensiones sin espacios)
        overflowWrap: 'anywhere',
      }}
    >
      <strong>{label}:</strong> {text}
    </Typography>
  )
}

export function IVRNode({ data }) {
  switch (data.type) {
    case 'menu':
      return (
        <NodeShell data={data}>
          <Line label="Dígito" value={data.digit} />
          <Line label="Etiqueta" value={data.label} />
        </NodeShell>
      )
    case 'timeout':
      return (
        <NodeShell data={data}>
          <Typography variant="caption">Sin dígito presionado</Typography>
        </NodeShell>
      )
    case 'ring_group':
      return (
        <NodeShell data={data}>
          <Line label="Extensiones" value={data.extensions} />
          <Line label="Timbrados" value={data.rings === 0 ? 'Indefinido' : data.rings} />
        </NodeShell>
      )
    case 'ring_single':
      return (
        <NodeShell data={data}>
          <Line label="Extensión" value={data.extension} />
          <Line label="Timbrados" value={data.rings === 0 ? 'Indefinido' : data.rings} />
        </NodeShell>
      )
    case 'voicemail':
      return (
        <NodeShell data={data}>
          <Typography variant="caption">Desvío a buzón de voz</Typography>
        </NodeShell>
      )
    case 'cadd':
      return (
        <NodeShell data={data}>
          <Line label="Destino" value={data.destination} />
        </NodeShell>
      )
    default:
      return <NodeShell data={data}><Typography variant="caption">{data.type}</Typography></NodeShell>
  }
}

export const nodeTypes = { ivrNode: IVRNode }
