import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import SecurityIcon from '@mui/icons-material/Security'

export default function MfaQrCard({ qrCode, manualSecret }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!manualSecret) return
    try {
      await navigator.clipboard.writeText(manualSecret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback si navigator.clipboard no está disponible
      const ta = document.createElement('textarea')
      ta.value = manualSecret
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: 3,
        textAlign: 'center',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
          <SecurityIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700} color="text.primary">
            Configuración de Authenticator (TOTP)
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escanea este código con <strong>Google Authenticator</strong>, <strong>Authy</strong> o <strong>Microsoft Authenticator</strong> en tu teléfono.
        </Typography>

        {/* Contenedor del código QR */}
        <Paper
          elevation={1}
          sx={{
            display: 'inline-flex',
            p: 1.5,
            bgcolor: '#ffffff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
          }}
        >
          {qrCode ? (
            <Box
              component="img"
              src={qrCode}
              alt="Código QR de autenticación"
              sx={{
                width: 190,
                height: 190,
                display: 'block',
              }}
            />
          ) : (
            <Box
              sx={{
                width: 190,
                height: 190,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
              }}
            >
              <QrCode2Icon sx={{ fontSize: 64 }} />
            </Box>
          )}
        </Paper>

        {/* Clave manual alternativa */}
        {manualSecret && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              ¿No puedes escanear el código? Ingresa esta clave manualmente:
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'grey.100',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'grey.400',
              }}
            >
              <Typography
                variant="body2"
                component="code"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: 'text.primary',
                }}
              >
                {manualSecret}
              </Typography>
              <Tooltip title={copied ? '¡Copiado!' : 'Copiar clave'}>
                <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                  {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
