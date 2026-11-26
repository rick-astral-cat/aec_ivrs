import { Box } from '@mui/material'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Enlaces del texto: siempre en otra pestaña y sin acceso a esta ventana.
const COMPONENTS = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
}

// Muestra texto Markdown (GFM: listas, tablas, tareas, tachado) con los estilos
// de la app. El HTML crudo no se interpreta: se muestra como texto, así que el
// contenido escrito por usuarios no puede inyectar código.
export default function MarkdownText({ children, sx }) {
  return (
    <Box
      sx={{
        typography: 'body2',
        color: 'text.primary',
        wordBreak: 'break-word',
        '& > :first-of-type': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p': { my: 1 },
        '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1, fontWeight: 600, lineHeight: 1.3 },
        '& h1': { fontSize: '1.25rem' },
        '& h2': { fontSize: '1.125rem' },
        '& h3, & h4, & h5, & h6': { fontSize: '1rem' },
        '& ul, & ol': { my: 1, pl: 3 },
        '& li': { my: 0.25 },
        '& li > p': { my: 0 },
        '& ul.contains-task-list': { listStyle: 'none', pl: 1 },
        '& input[type="checkbox"]': { mr: 0.75, verticalAlign: 'middle' },
        '& a': { color: 'primary.main' },
        '& code': {
          fontFamily: 'monospace',
          fontSize: '0.85em',
          bgcolor: 'action.hover',
          px: 0.5,
          py: 0.125,
          borderRadius: 0.5,
        },
        '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflowX: 'auto' },
        '& pre code': { bgcolor: 'transparent', p: 0 },
        '& blockquote': {
          my: 1,
          mx: 0,
          pl: 1.5,
          borderLeft: '3px solid',
          borderColor: 'divider',
          color: 'text.secondary',
        },
        '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 },
        '& table': { borderCollapse: 'collapse', my: 1, display: 'block', overflowX: 'auto' },
        '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, textAlign: 'left' },
        '& th': { bgcolor: 'action.hover', fontWeight: 600 },
        ...sx,
      }}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </Markdown>
    </Box>
  )
}
