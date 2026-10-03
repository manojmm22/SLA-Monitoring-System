import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  ArrowLeft,
  ArrowRight,
  Lock,
  User,
  Mail,
  UserPlus,
  Radio,
} from 'lucide-react'
import api from '../services/api'

const capabilities = [
  { label: 'Role-based access control (Admin, Engineer, Viewer)', icon: UserPlus },
  { label: 'Cryptographically hashed passwords & secure JWT', icon: Lock },
  { label: 'Instant access to live monitoring dashboards', icon: Activity },
]

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
      })
      navigate('/login', { replace: true })
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message || 'Unable to create your account. Please try again.'
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
      {/* Background ambient lighting */}
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
            icon={<Radio size={14} color="#38bdf8" />}
            label="NEW OPERATOR ONBOARDING"
            size="small"
            sx={{
              mb: 2.5,
              bgcolor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
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
            Create your{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              operations console profile.
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
            Join your engineering team on the SLA command center. Monitor endpoints, trigger AI
            forecasts, and automate self-healing incidents.
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
            <Box sx={{ textAlign: 'center', mb: 3 }}>
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
                <UserPlus size={28} color="#030d1a" strokeWidth={2.5} />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                Register Operator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your credentials to access the telemetry dashboard.
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
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="dense"
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
                label="Corporate Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="dense"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} color="#64748b" />
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
                margin="dense"
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

              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="dense"
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
                {loading ? 'Creating Profile...' : 'Complete Registration'}
              </Button>
            </form>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                component={Link}
                to="/login"
                startIcon={<ArrowLeft size={16} />}
                sx={{ color: '#94a3b8', fontSize: '0.84rem' }}
              >
                Return to Operator Sign In
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
