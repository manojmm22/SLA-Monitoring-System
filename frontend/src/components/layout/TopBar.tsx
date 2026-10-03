import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  InputBase,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Menu as MenuIcon,
  Activity,
  Bot,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'
import api from '../../services/api'

type TopBarProps = { onMenuClick: () => void }

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout, userRole } = useAuth()
  const { isDarkMode, toggleTheme } = useThemeMode()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [activeAlertCount, setActiveAlertCount] = useState(0)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await api.get('/alerts/stats')
        setActiveAlertCount(res.data?.data?.active ?? 0)
      } catch {
        setActiveAlertCount(0)
      }
    }

    fetchAlertCount()
    const timer = setInterval(fetchAlertCount, 8000)
    return () => clearInterval(timer)
  }, [])

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'rgba(7, 14, 27, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          minHeight: { xs: 60, sm: 68 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={onMenuClick}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              color: '#38bdf8',
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(56, 189, 248, 0.08)',
            }}
            aria-label="Open navigation"
          >
            <MenuIcon size={20} />
          </IconButton>

          {/* Quick Search */}
          <Box
            sx={{
              alignItems: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.16)',
              borderRadius: 2.5,
              px: 1.8,
              py: 0.6,
              width: { sm: 260, md: 340 },
              display: { xs: 'none', sm: 'flex' },
              transition: 'all 0.2s ease',
              '&:focus-within': {
                borderColor: '#38bdf8',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.2)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
              },
            }}
          >
            <Search size={16} color="#64748b" />
            <InputBase
              placeholder="Search services, alerts, metrics..."
              sx={{
                ml: 1.2,
                flexGrow: 1,
                color: 'text.primary',
                fontSize: '0.84rem',
                '& input::placeholder': { color: '#64748b', opacity: 1 },
              }}
            />
            <Chip
              label="⌘K"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.64rem',
                fontFamily: 'JetBrains Mono, monospace',
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                color: '#94a3b8',
              }}
            />
          </Box>
        </Box>

        {/* Right Action Icons & Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.8 } }}>
          {/* Telemetry live status pill */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 8px #10b981',
                animation: 'pulseGlow 2s infinite',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#34d399',
              }}
            >
              TELEMETRY STREAM ACTIVE
            </Typography>
          </Box>

          {/* Quick link to Agents */}
          <Tooltip title="Run Autonomous Agents">
            <IconButton
              onClick={() => navigate('/agents')}
              sx={{
                color: '#94a3b8',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                p: 1,
                borderRadius: 2,
                '&:hover': { color: '#38bdf8', bgcolor: 'rgba(56, 189, 248, 0.1)' },
              }}
            >
              <Bot size={18} />
            </IconButton>
          </Tooltip>

          {/* Theme Mode Toggle */}
          <Tooltip title={isDarkMode ? 'Switch to Light' : 'Switch to Dark'}>
            <IconButton
              onClick={toggleTheme}
              sx={{
                color: '#94a3b8',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                p: 1,
                borderRadius: 2,
                '&:hover': { color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' },
              }}
            >
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
          </Tooltip>

          {/* Alerts Bell Icon */}
          <Tooltip title={`${activeAlertCount} active alerts`}>
            <IconButton
              onClick={() => navigate('/alerts')}
              sx={{
                color: activeAlertCount > 0 ? '#fb7185' : '#94a3b8',
                bgcolor:
                  activeAlertCount > 0
                    ? 'rgba(244, 63, 94, 0.12)'
                    : 'rgba(255, 255, 255, 0.04)',
                border:
                  activeAlertCount > 0
                    ? '1px solid rgba(244, 63, 94, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                p: 1,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'rgba(244, 63, 94, 0.2)',
                },
              }}
            >
              <Badge
                badgeContent={activeAlertCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 18,
                    minWidth: 18,
                  },
                }}
              >
                <Bell size={18} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile Pill */}
          <Box
            onClick={handleMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              cursor: 'pointer',
              p: 0.6,
              pr: 1.5,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.12)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(56, 189, 248, 0.08)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                color: '#030d1a',
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ lineHeight: 1.2, fontSize: '0.82rem', color: '#f8fafc' }}
              >
                {user?.full_name || user?.username || 'Operator'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#38bdf8',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.04em',
                }}
              >
                {userRole?.toUpperCase() || 'OPERATOR'}
              </Typography>
            </Box>
          </Box>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                backgroundColor: 'rgba(11, 19, 34, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 2.5,
                minWidth: 180,
                mt: 1.2,
                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              },
            }}
          >
            <MenuItem onClick={() => { handleClose(); navigate('/users') }} sx={{ gap: 1.5, py: 1.2 }}>
              <UserIcon size={16} color="#38bdf8" />
              <Typography variant="body2" fontWeight={600}>Account Profile</Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/settings') }} sx={{ gap: 1.5, py: 1.2 }}>
              <Activity size={16} color="#38bdf8" />
              <Typography variant="body2" fontWeight={600}>System Config</Typography>
            </MenuItem>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 0.5 }} />
            <MenuItem onClick={logout} sx={{ gap: 1.5, py: 1.2, color: '#fb7185' }}>
              <LogOut size={16} />
              <Typography variant="body2" fontWeight={700}>Sign Out</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
