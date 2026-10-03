import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  LinearProgress,
} from '@mui/material'
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Brain,
  FileText,
  LayoutDashboard,
  Server,
  Settings,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import api from '../../services/api'

const drawerWidth = 270

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', group: 'overview' },
  { path: '/services', icon: Server, label: 'Services', group: 'overview' },
  { path: '/monitoring', icon: Activity, label: 'Live Telemetry', group: 'monitoring', badge: 'LIVE' },
  { path: '/agents', icon: Bot, label: 'Autonomous Agents', group: 'monitoring' },
  { path: '/alerts', icon: Bell, label: 'Incidents & Alerts', group: 'monitoring' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', group: 'insights' },
  { path: '/predictions', icon: Brain, label: 'AI Breach Predictor', group: 'insights', badge: 'AI' },
  { path: '/recovery', icon: ShieldCheck, label: 'Recovery Center', group: 'insights', badge: 'AUTO' },
  { path: '/reports', icon: FileText, label: 'Reports & Audits', group: 'admin' },
  { path: '/users', icon: Users, label: 'Access Control', group: 'admin' },
  { path: '/settings', icon: Settings, label: 'Settings', group: 'admin' },
]

const groups = [
  { key: 'overview', label: 'Command & Overview' },
  { key: 'monitoring', label: 'Live Telemetry' },
  { key: 'insights', label: 'AI & Remediation' },
  { key: 'admin', label: 'Administration' },
]

type SidebarProps = { mobileOpen: boolean; onMobileClose: () => void }

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeAlerts, setActiveAlerts] = useState<number>(0)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/alerts/stats')
        setActiveAlerts(res.data?.data?.active ?? 0)
      } catch {
        // quiet fallback
      }
    }
    fetchCounts()
    const timer = setInterval(fetchCounts, 10000)
    return () => clearInterval(timer)
  }, [])

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 55%, #10b981 140%)',
              boxShadow: '0 0 24px rgba(56, 189, 248, 0.35)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <Activity size={22} color="#040e1b" strokeWidth={2.5} />
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 10px #10b981',
                border: '2px solid #050b14',
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                lineHeight: 1.15,
                background: 'linear-gradient(90deg, #ffffff 0%, #7dd3fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                fontSize: '1.05rem',
              }}
            >
              SLA Sentinel
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#38bdf8',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.08em',
                display: 'block',
              }}
            >
              AUTONOMOUS OPS // V2.4
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(56, 189, 248, 0.1)', mx: 2 }} />

      {/* Navigation Group Items */}
      <Box sx={{ px: 1.5, py: 2, overflowY: 'auto', flexGrow: 1 }}>
        {groups.map((group) => (
          <Box key={group.key} mb={2.2}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                mb: 0.6,
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontSize: '0.64rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                color: 'rgba(148, 163, 184, 0.7)',
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {menuItems
                .filter((item) => item.group === group.key)
                .map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path))
                  const hasAlertBadge = item.path === '/alerts' && activeAlerts > 0

                  return (
                    <ListItem key={item.path} disablePadding sx={{ mb: 0.4 }}>
                      <ListItemButton
                        onClick={() => {
                          navigate(item.path)
                          onMobileClose()
                        }}
                        sx={{
                          borderRadius: 2,
                          py: 0.9,
                          px: 1.6,
                          backgroundColor: isActive
                            ? 'rgba(56, 189, 248, 0.12)'
                            : 'transparent',
                          color: isActive ? '#38bdf8' : '#94a3b8',
                          border: isActive
                            ? '1px solid rgba(56, 189, 248, 0.28)'
                            : '1px solid transparent',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': isActive
                            ? {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: '20%',
                                bottom: '20%',
                                width: 3,
                                borderRadius: '0 4px 4px 0',
                                backgroundColor: '#38bdf8',
                                boxShadow: '0 0 10px #38bdf8',
                              }
                            : {},
                          '&:hover': {
                            backgroundColor: isActive
                              ? 'rgba(56, 189, 248, 0.18)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: isActive ? '#7dd3fc' : '#ffffff',
                            transform: 'translateX(2px)',
                          },
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: 'inherit',
                            minWidth: 34,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.84rem',
                            letterSpacing: '-0.01em',
                          }}
                        />

                        {hasAlertBadge ? (
                          <Chip
                            label={activeAlerts}
                            size="small"
                            sx={{
                              height: 19,
                              minWidth: 20,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              bgcolor: 'rgba(244, 63, 94, 0.2)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          />
                        ) : (
                          item.badge && (
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                bgcolor:
                                  item.badge === 'LIVE'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : item.badge === 'AI'
                                    ? 'rgba(168, 85, 247, 0.18)'
                                    : 'rgba(56, 189, 248, 0.16)',
                                color:
                                  item.badge === 'LIVE'
                                    ? '#34d399'
                                    : item.badge === 'AI'
                                    ? '#c084fc'
                                    : '#7dd3fc',
                                border: '1px solid currentColor',
                                opacity: 0.9,
                              }}
                            />
                          )
                        )}
                      </ListItemButton>
                    </ListItem>
                  )
                })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Footer System Telemetry Status Card */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(56, 189, 248, 0.1)' }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.12)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  animation: 'pulseGlow 2s infinite',
                }}
              />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.68rem',
                  color: '#34d399',
                  letterSpacing: '0.04em',
                }}
              >
                CLUSTER NOMINAL
              </Typography>
            </Box>
            <Zap size={14} color="#38bdf8" />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              SLA Health
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ fontSize: '0.68rem', color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}
            >
              99.98%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={99.98}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#10b981',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  )

  const paperStyles = {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: '1px solid rgba(56, 189, 248, 0.12)',
    background: 'rgba(6, 12, 24, 0.94)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  }

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': paperStyles,
        }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': paperStyles,
        }}
      >
        {content}
      </Drawer>
    </>
  )
}
