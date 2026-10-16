import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShieldIcon from '@mui/icons-material/Shield'
import PhonelinkRingIcon from '@mui/icons-material/PhonelinkRing'

import { useAuth } from '../context/AuthContext'
import { login, verifyMfaLogin, verifyMfaSetup } from '../api/auth'
import MfaQrCard from '../components/MfaQrCard'
import MfaCodeInput from '../components/MfaCodeInput'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { handleLoginSuccess } = useAuth()

  // Estados del flujo: 'CREDENTIALS' | 'SETUP_MFA' | 'REQUIRE_MFA'
  const [step, setStep] = useState('CREDENTIALS')

  // Datos del formulario de credenciales
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Datos de MFA recibidos del backend
  const [mfaData, setMfaData] = useState({
    setupToken: '',
    challengeToken: '',
    qrCode: '',
    manualSecret: '',
    userTarget: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname || '/'

  // Paso 1: Envío de credenciales
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Por favor ingresa usuario y contraseña')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await login(username.trim(), password)
      const data = res.data

      if (data.status === 'SETUP_MFA') {
        setMfaData({
          setupToken: data.setup_token,
          challengeToken: '',
          qrCode: data.qr_code,
          manualSecret: data.manual_secret,
          userTarget: data.username,
        })
        setStep('SETUP_MFA')
      } else if (data.status === 'REQUIRE_MFA') {
        setMfaData({
          setupToken: '',
          challengeToken: data.challenge_token,
          qrCode: '',
          manualSecret: '',
          userTarget: data.username,
        })
        setStep('REQUIRE_MFA')
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar sesión. Revisa tus credenciales.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Paso 2A: Verificación de configuración inicial MFA (QR)
  const handleVerifySetup = async (code) => {
    setLoading(true)
    setError(null)
    try {
      const res = await verifyMfaSetup(mfaData.setupToken, code)
      handleLoginSuccess(res.data)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Código incorrecto o expirado. Intenta nuevamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Paso 2B: Verificación de login MFA habitual
  const handleVerifyLogin = async (code) => {
    setLoading(true)
    setError(null)
    try {
      const res = await verifyMfaLogin(mfaData.challengeToken, code)
      handleLoginSuccess(res.data)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Código MFA incorrecto o expirado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setStep('CREDENTIALS')
    setError(null)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Card
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: step === 'SETUP_MFA' ? 480 : 420,
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Barra superior con color corporativo Dalton */}
        <Box sx={{ height: 6, bgcolor: 'primary.main' }} />

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Encabezado y logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                boxShadow: 2,
              }}
            >
              {step === 'SETUP_MFA' ? (
                <PhonelinkRingIcon sx={{ fontSize: 28 }} />
              ) : step === 'REQUIRE_MFA' ? (
                <ShieldIcon sx={{ fontSize: 28 }} />
              ) : (
                <LockOutlinedIcon sx={{ fontSize: 28 }} />
              )}
            </Box>

            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
              AEC IVRS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {step === 'SETUP_MFA'
                ? 'Configuración de seguridad requerida'
                : step === 'REQUIRE_MFA'
                ? 'Verificación en dos pasos (MFA)'
                : 'Dalton IVR Manager — Acceso al Sistema'}
            </Typography>
          </Box>

          {/* Alerta de errores */}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* ── PASO 1: Ingreso de Usuario y Contraseña ── */}
          {step === 'CREDENTIALS' && (
            <Box component="form" onSubmit={handleCredentialsSubmit}>
              <TextField
                fullWidth
                label="Usuario o correo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                autoComplete="username"
                autoFocus
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircleIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                autoComplete="current-password"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 1, py: 1.25, fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Continuar'}
              </Button>
            </Box>
          )}

          {/* ── PASO 2A: Enrolamiento de MFA con Código QR ── */}
          {step === 'SETUP_MFA' && (
            <Box>
              <MfaQrCard
                qrCode={mfaData.qrCode}
                manualSecret={mfaData.manualSecret}
                issuer="Dalton AEC IVRS"
              />

              <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5, textAlign: 'center' }}>
                Ingresa el código generado para confirmar:
              </Typography>

              <MfaCodeInput
                onSubmit={handleVerifySetup}
                loading={loading}
                buttonText="Confirmar y Activar MFA"
              />

              <Button
                fullWidth
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToLogin}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Volver a inicio de sesión
              </Button>
            </Box>
          )}

          {/* ── PASO 2B: Desafío de MFA para usuario con 2FA activo ── */}
          {step === 'REQUIRE_MFA' && (
            <Box sx={{ textAlign: 'center' }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Abre tu app <strong>Google Authenticator</strong> o <strong>Authy</strong> e introduce el código temporal generado para <strong>{mfaData.userTarget}</strong>.
                </Typography>
              </Paper>

              <MfaCodeInput
                onSubmit={handleVerifyLogin}
                loading={loading}
                buttonText="Verificar y Entrar"
              />

              <Button
                fullWidth
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToLogin}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Volver a inicio de sesión
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
