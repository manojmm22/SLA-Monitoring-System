import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material'
import {
  Activity,
  ArrowRight,
  Lock,
  Shield,
  User,
  Zap,
  Radio,
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const capabilities = [
  { label: 'Sub-second real-time telemetry streaming', icon: Activity },
  { label: 'Random Forest AI SLA breach prediction', icon: Zap },
  { label: 'Autonomous self-healing remediation', icon: Shield },
  { label: 'Enterprise RBAC & cryptographically signed tokens', icon: Lock },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, location.state, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { username, password })
      const { access_token, user } = response.data.data
      login(access_token, user)
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          'Unable to authenticate. Check your credentials and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient lighting circles */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          width: '100%',
          maxWidth: 1100,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
          gap: { xs: 4, md: 8 },
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Hero Section */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, pr: 2 }}>
          <Chip
            icon={<Radio size={14} color="#34d399" />}
            label="MISSION-CRITICAL OPERATIONS"
            size="small"
            sx={{
              mb: 2.5,
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.08em',
              fontWeight: 800,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontSize: { md: '3.2rem', lg: '3.8rem' },
              lineHeight: 1.08,
              mb: 2.5,
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            Observe every signal.{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Master the SLA.
            </Box>
          </Typography>
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: '1.05rem',
              lineHeight: 1.6,
              mb: 4,
              maxWidth: 480,
            }}
          >
            The next-generation observability command plane for real-time telemetry, automated
            incident detection, and autonomous cluster healing.
          </Typography>

          <Stack spacing={2}>
            {capabilities.map(({ label, icon: Icon }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </Box>
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Right Form Card */}
        <Card
          sx={{
            width: '100%',
            maxWidth: { xs: 460, md: 'none' },
            justifySelf: 'center',
            boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            background:
              'linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(8, 14, 28, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 3.5, sm: 4.5 } }}>
            {/* Logo Badge */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 60%, #10b981 140%)',
                  boxShadow: '0 0 32px rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                }}
              >
                <Shield size={28} color="#030d1a" strokeWidth={2.5} />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                Operator Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your credentials to access the SLA Command Console.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <TextField
                fullWidth
                label="Username or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(11, 19, 34, 0.6)',
                    borderRadius: 2.5,
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(11, 19, 34, 0.6)',
                    borderRadius: 2.5,
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                endIcon={<ArrowRight size={18} />}
                sx={{
                  mt: 3,
                  py: 1.4,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#030d1a',
                  boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0369a1 0%, #7dd3fc 100%)',
                  },
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Console'}
              </Button>
            </form>

            <Box
              sx={{
                mt: 2.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(56, 189, 248, 0.07)',
                border: '1px dashed rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>
                  Default Admin Credentials
                </Typography>
                <Typography variant="caption" sx={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>
                  admin / Admin@123
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setUsername('admin')
                  setPassword('Admin@123')
                }}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.3,
                  px: 1.2,
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.12)' },
                }}
              >
                Auto-Fill
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an operator account?{' '}
                <Link
                  to="/register"
                  style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}
                >
                  Register new account
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
