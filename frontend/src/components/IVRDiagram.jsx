import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import {
  Alert, Box, Button, ButtonGroup, Divider, Typography,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import { treeToMermaid } from './mermaidUtils'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

let _diagramId = 0

export default function IVRDiagram({ ivr, agencyName }) {
  const containerRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const mermaidText = treeToMermaid(ivr, agencyName)

  useEffect(() => {
    if (!mermaidText || !containerRef.current) return
    setError(null)
    const id = `mermaid-${++_diagramId}`

    mermaid.render(id, mermaidText)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg
      })
      .catch(() => setError('No se pudo renderizar el diagrama. Verifica que el IVR esté bien conectado.'))
  }, [mermaidText])

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([mermaidText], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${agencyName ?? 'ivr'}_diagram.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!ivr?.length) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          Diagrama IVR
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button startIcon={<ContentCopyIcon />} onClick={handleCopy}>
            {copied ? '¡Copiado!' : 'Copiar Mermaid'}
          </Button>
          <Button startIcon={<DownloadIcon />} onClick={handleDownload}>
            Descargar .md
          </Button>
        </ButtonGroup>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {error
        ? <Alert severity="warning">{error}</Alert>
        : (
          <Box
            ref={containerRef}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              bgcolor: 'background.paper',
              overflowX: 'auto',
              '& svg': { maxWidth: '100%', height: 'auto' },
            }}
          />
        )
      }
    </Box>
  )
}
