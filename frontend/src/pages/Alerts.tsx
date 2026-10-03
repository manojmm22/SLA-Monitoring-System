import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  Chip,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material'
import {
  CheckCircle,
  Eye,
  AlertTriangle,
  Bell,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import api from '../services/api'
import KPICard from '../components/common/KPICard'

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, critical: 0, resolved: 0 })
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts/')
      setAlerts(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/alerts/stats')
      setStats(res.data.data || { total: 0, active: 0, critical: 0, resolved: 0 })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchAlerts()
    fetchStats()
    const interval = window.setInterval(() => {
      fetchAlerts()
      fetchStats()
    }, 6000)
    return () => window.clearInterval(interval)
  }, [])

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post(`/alerts/${id}/${action}`)
      fetchAlerts()
      fetchStats()
      if (selectedAlert && selectedAlert.id === id) {
        setSelectedAlert((prev: any) => ({ ...prev, status: action === 'resolve' ? 'resolved' : 'acknowledged' }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getSeverityStyle = (severity: string) => {
    const s = severity?.toLowerCase()
    if (s === 'critical') return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: '#f43f5e' }
    if (s === 'high') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' }
    if (s === 'medium') return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' }
    return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: '#94a3b8' }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSearch =
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase()) ||
        a.service_name?.toLowerCase().includes(search.toLowerCase())
      const matchesSeverity =
        severityFilter === 'all' || a.severity?.toLowerCase() === severityFilter.toLowerCase()
      const matchesStatus =
        statusFilter === 'all' || a.status?.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [alerts, search, severityFilter, statusFilter])

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" fontWeight={800}>
              Incident & Alert Manager
            </Typography>
            <Chip
              label={`${stats.active} UNRESOLVED`}
              size="small"
              sx={{
                bgcolor: stats.active > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: stats.active > 0 ? '#fb7185' : '#34d399',
                border: `1px solid ${stats.active > 0 ? '#f43f5e' : '#10b981'}40`,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: '0.68rem',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Continuous anomaly detection, SLA breach warnings, and autonomous remediation signals.
          </Typography>
        </Box>
      </Box>

      {/* KPI Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={Bell}
            title="Total Alert Events"
            value={stats.total}
            color="#38bdf8"
            subtitle="Lifetime incident stream"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={ShieldAlert}
            title="Active Incidents"
            value={stats.active}
            color={stats.active > 0 ? '#f43f5e' : '#10b981'}
            subtitle="Requires operator triage"
            trend={stats.active > 0 ? 'down' : 'up'}
            trendValue={stats.active > 0 ? 'ACTIVE' : 'NOMINAL'}
            delay={50}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={AlertTriangle}
            title="Critical Severity"
            value={stats.critical}
            color="#f59e0b"
            subtitle="Tier-1 SLA impact"
            delay={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={CheckCircle2}
            title="Resolved Incidents"
            value={stats.resolved}
            color="#10b981"
            subtitle="Auto & manually cleared"
            trend="up"
            trendValue="STABLE"
            delay={150}
          />
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="Search alerts by service, keyword, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#64748b" />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: { xs: '100%', sm: 300 },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 2,
                fontSize: '0.84rem',
              },
            }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <Chip
                key={sev}
                label={sev.toUpperCase()}
                clickable
                onClick={() => setSeverityFilter(sev)}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  bgcolor:
                    severityFilter === sev
                      ? '#38bdf8'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: severityFilter === sev ? '#040e1b' : '#94a3b8',
                  border:
                    severityFilter === sev
                      ? '1px solid #38bdf8'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            ))}
            {['all', 'active', 'resolved'].map((st) => (
              <Chip
                key={st}
                label={`STATUS: ${st.toUpperCase()}`}
                clickable
                onClick={() => setStatusFilter(st)}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  borderColor: statusFilter === st ? '#34d399' : 'rgba(255,255,255,0.1)',
                  color: statusFilter === st ? '#34d399' : '#94a3b8',
                }}
              />
            ))}
          </Stack>
        </Box>
      </Card>

      {/* Alert Cards Grid */}
      <Grid container spacing={2}>
        {filteredAlerts.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ p: 6, textAlign: 'center' }}>
              <CheckCircle2 size={42} color="#10b981" style={{ marginBottom: 12 }} />
              <Typography variant="h6" fontWeight={700}>
                No Incidents Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No telemetry alerts match your current filter selection.
              </Typography>
            </Card>
          </Grid>
        ) : (
          filteredAlerts.map((alert) => {
            const sev = getSeverityStyle(alert.severity)
            const isAI = alert.metric_name?.startsWith('predicted')

            return (
              <Grid item xs={12} md={6} key={alert.id}>
                <Card
                  sx={{
                    p: 2.5,
                    borderLeft: `5px solid ${sev.color}`,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 12px 30px -8px rgba(0, 0, 0, 0.5), 0 0 16px -4px ${sev.color}30`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0, pr: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc' }}>
                          {alert.title}
                        </Typography>
                        {isAI && (
                          <Chip
                            icon={<Sparkles size={12} />}
                            label="AI FORECAST"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              bgcolor: 'rgba(168, 85, 247, 0.18)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem', mb: 1.5 }}>
                        {alert.description}
                      </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 0.8, flexShrink: 0 }}>
                      {alert.status === 'active' && (
                        <Tooltip title="Acknowledge Alert">
                          <IconButton
                            size="small"
                            onClick={() => handleAction(alert.id, 'acknowledge')}
                            sx={{
                              bgcolor: 'rgba(245, 158, 11, 0.12)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              p: 0.8,
                            }}
                          >
                            <Clock size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {alert.status !== 'resolved' && (
                        <Tooltip title="Resolve & Clear">
                          <IconButton
                            size="small"
                            onClick={() => handleAction(alert.id, 'resolve')}
                            sx={{
                              bgcolor: 'rgba(16, 185, 129, 0.12)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              p: 0.8,
                            }}
                          >
                            <CheckCircle size={16} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Incident Forensics">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedAlert(alert)}
                          sx={{
                            bgcolor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            p: 0.8,
                          }}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Badges footer */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                      pt: 1.5,
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Chip
                      label={alert.severity?.toUpperCase()}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        bgcolor: sev.bg,
                        color: sev.color,
                        border: `1px solid ${sev.border}40`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Chip
                      label={alert.status?.toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 20,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#64748b',
                        fontSize: '0.72rem',
                        ml: 'auto',
                      }}
                    >
                      {alert.service_name} • {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'Recent'}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            )
          })
        )}
      </Grid>

      {/* Alert Details Forensics Modal */}
      <Dialog
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShieldAlert size={22} color="#f43f5e" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Incident Forensic Telemetry
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Alert ID #{selectedAlert?.id} • Service: {selectedAlert?.service_name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAlert && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#f8fafc', mb: 0.5 }}>
                  {selectedAlert.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAlert.description}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Metric Trigger
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}
                  >
                    {selectedAlert.metric_name || 'response_time'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Observed Metric Value
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#f43f5e' }}
                  >
                    {selectedAlert.metric_value ?? 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Severity Level
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {selectedAlert.severity?.toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Lifecycle Status
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#10b981' }}>
                    {selectedAlert.status?.toUpperCase()}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                }}
              >
                <Typography variant="caption" color="#38bdf8" fontWeight={700} display="block" mb={0.5}>
                  REMEDIATION RECOMMENDATION
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check endpoint health and host thread count. If latency persists above threshold,
                  trigger the Autonomous Recovery Center restart protocol.
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedAlert(null)}>Close</Button>
          {selectedAlert?.status !== 'resolved' && (
            <Button
              variant="contained"
              startIcon={<CheckCircle size={16} />}
              onClick={() => handleAction(selectedAlert.id, 'resolve')}
            >
              Resolve Incident
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}