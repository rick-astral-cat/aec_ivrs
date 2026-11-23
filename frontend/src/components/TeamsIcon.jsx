import { SvgIcon } from '@mui/material'

// Color morado característico de Microsoft Teams.
export const TEAMS_COLOR = '#5B5FC7'

// Icono propio inspirado en Teams (MUI no incluye logos de marcas):
// un recuadro con una "T" y una persona al costado.
export default function TeamsIcon({ sx, ...props }) {
  return (
    <SvgIcon viewBox="0 0 24 24" sx={{ color: TEAMS_COLOR, ...sx }} {...props}>
      {/* Persona */}
      <circle cx="18.5" cy="5.5" r="2.5" />
      <path d="M15.5 9.5h6a1 1 0 0 1 1 1v4.5a3.5 3.5 0 0 1-5.6 2.8V11a1.5 1.5 0 0 0-1.4-1.5z" opacity="0.75" />
      {/* Recuadro con la "T" */}
      <rect x="1.5" y="6" width="14" height="14" rx="2.5" />
      <path d="M5 9.5h7v2H9.5V17h-2v-5.5H5z" fill="#fff" />
    </SvgIcon>
  )
}
