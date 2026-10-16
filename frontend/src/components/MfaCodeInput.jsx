import { useState } from 'react'
import { Box, Button, CircularProgress, TextField } from '@mui/material'
import KeyIcon from '@mui/icons-material/Key'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

export default function MfaCodeInput({
  onSubmit,
  loading = false,
  buttonText = 'Verificar Código',
  helperText = 'Ingresa el código numérico de 6 dígitos de tu aplicación Authenticator',
}) {
  const [code, setCode] = useState('')

  const handleChange = (e) => {
    // Aceptar solo números y máximo 6 caracteres
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(val)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && code.length === 6 && !loading) {
      onSubmit(code)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.length === 6 && !loading) {
      onSubmit(code)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <TextField
        fullWidth
        autoFocus
        label="Código de verificación"
        placeholder="123456"
        value={code}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={loading}
        inputProps={{
          inputMode: 'numeric',
          pattern: '[0-9]*',
          maxLength: 6,
          style: {
            textAlign: 'center',
            letterSpacing: '0.45em',
            fontSize: '1.45rem',
            fontWeight: 700,
            fontFamily: 'monospace',
          },
        }}
        helperText={helperText}
        FormHelperTextProps={{ sx: { textAlign: 'center', mt: 1 } }}
        sx={{ mb: 2.5 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={code.length !== 6 || loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <KeyIcon />}
        endIcon={!loading && <ArrowForwardIcon />}
        sx={{ py: 1.25, fontWeight: 600 }}
      >
        {loading ? 'Verificando...' : buttonText}
      </Button>
    </Box>
  )
}
