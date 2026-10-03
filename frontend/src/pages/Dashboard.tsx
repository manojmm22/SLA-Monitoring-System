import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Divider,
  Button,
} from '@mui/material'
import {
  Server,
  Clock,
  Cpu,
  HardDrive,
  Bell,
  Activity,
  ShieldCheck,
  Gauge,
  RefreshCw,
  ArrowUpRight,
  Radio,
  CheckCircle2,
} from 'lucide-react'
import api from '../services/api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import KPICard from '../components/common/KPICard'

interface DashboardStats {
  total_services: number
  healthy_services: number
  degraded_services: number
  critical_services: number
  down_services: number
  critical_or_down_services: number
  average_response_time: number
  cpu_usage: number
  ram_usage: number
  disk_usage: number
  active_alerts: number
  availability: number
  sla_compliance: number
  memory_total_gb?: number
  memory_available_gb?: number
  disk_total_gb?: number
  disk_free_gb?: number
  network_in_mb?: number
  network_out_mb?: number
  process_count?: number
  thread_count?: number
  violations: Array<{
    severity?: string
    metric_type?: string
    deviation_percentage?: number
    timestamp?: string
  }>
  updated_at?: string
}

interface ServiceItem {
  id: number
  name: string
  status: string
  base_url: string
  health_score: number
  response_time?: number
}

const STATUS_COLORS: Record<string, string> = {
  Healthy: '#10b981',
  Degraded: '#f59e0b',
  Critical: '#f43f5e',
  Down: '#64748b',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [currentTime, setCurrentTime] = useState('')
  const [timeRange, setTimeRange] = useState<number>(6)
  const [refreshing, setRefreshing] = useState(false)

  // Real-time second clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      setCurrentTime(`${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`)
    }
    updateClock()
    const interval = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const fetchData = async (rangeHours = timeRange) => {
    try {
      setRefreshing(true)
      const [statsRes, trendsRes, alertsRes, servicesRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get(`/analytics/trends?hours=${rangeHours}`),
        api.get('/alerts/?per_page=6'),
        api.get('/services/'),
      ])
      const dashboardData = statsRes.data.data as DashboardStats
      setStats(dashboardData)
      setServices(servicesRes.data.data || [])

      setLastUpdated(
        dashboardData.updated_at
          ? new Date(dashboardData.updated_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : 'just now'
      )

      const logs = trendsRes.data.data.response_time_trend || []
      const sampled = logs.filter((_: any, i: number) => i % 4 === 0).slice(-35)
      setTrendData(
        sampled.map((log: any) => ({
          time: new Date(log.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          responseTime: Math.round(log.response_time || 0),
        }))
      )

      setRecentAlerts(alertsRes.data.data || [])
    } catch (err) {
      console.error('Dashboard fetch error', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData(timeRange)
    const interval = window.setInterval(() => fetchData(timeRange), 6000)
    return () => window.clearInterval(interval)
  }, [timeRange])

  const pieData = stats
    ? [
        { name: 'Healthy', value: stats.healthy_services },
        { name: 'Degraded', value: stats.degraded_services },
        { name: 'Critical', value: stats.critical_services },
        { name: 'Down', value: stats.down_services },
      ].filter((d) => d.value > 0)
    : []

  const statusTone = useMemo(() => {
    if (!stats) return { label: 'SYNCHRONIZING', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' }
    if (stats.sla_compliance >= 99)
      return { label: 'OPTIMAL COMPLIANCE', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
    if (stats.sla_compliance >= 95)
      return { label: 'ACCEPTABLE POSTURE', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' }
    if (stats.sla_compliance >= 90)
      return { label: 'ELEVATED RISK', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
    return { label: 'CRITICAL BREACH RISK', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.14)' }
  }, [stats])

  if (!stats) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '70vh',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            animation: 'pulseGlowCyan 2s infinite',
          }}
        >
          <Activity size={32} color="#38bdf8" />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
          Initializing SLA Command Center…
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Streaming live microservices telemetry and SLA posture
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Top Hero Command Banner ─────────────────────────────────── */}
      <Card
        sx={{
          mb: 3,
          p: { xs: 2.5, sm: 3 },
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(99, 102, 241, 0.1) 100%)',
          borderColor: 'rgba(56, 189, 248, 0.22)',
          boxShadow: '0 12px 36px -6px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Title & Posture */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  background: 'linear-gradient(90deg, #f8fafc 0%, #7dd3fc 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                SLA Command Center
              </Typography>
              <Chip
                label={statusTone.label}
                size="small"
                sx={{
                  bgcolor: statusTone.bg,
                  color: statusTone.color,
                  border: `1px solid ${statusTone.color}40`,
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.04em',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 680 }}>
              Real-time enterprise microservices telemetry, automated SLA breach prevention, and
              instant remediation controls.
            </Typography>
          </Box>

          {/* Time, Refresh & Actions */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.6,
                borderRadius: 2,
                bgcolor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
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
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#e2e8f0',
                  fontSize: '0.75rem',
                }}
              >
                {currentTime} {lastUpdated && `(Updated ${lastUpdated})`}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => fetchData()}
              disabled={refreshing}
              sx={{
                borderColor: 'rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.78rem',
              }}
            >
              {refreshing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* ── KPI Row (Executive Telemetry) ───────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={Server}
            title="Monitored Services"
            value={stats.total_services}
            color="#38bdf8"
            subtitle={`${stats.healthy_services} healthy (${stats.availability}% availability)`}
            trend="up"
            trendValue="100% target"
            onClick={() => navigate('/services')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={ShieldCheck}
            title="SLA Compliance"
            value={stats.sla_compliance}
            suffix="%"
            color={stats.sla_compliance >= 99 ? '#10b981' : '#f59e0b'}
            subtitle="Tier-1 SLO standard: 99.5%"
            trend={stats.sla_compliance >= 99 ? 'up' : 'down'}
            trendValue={stats.sla_compliance >= 99 ? 'COMPLIANT' : 'WATCH'}
            delay={50}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={Clock}
            title="Avg Response Latency"
            value={Math.round(stats.average_response_time)}
            suffix="ms"
            color="#a855f7"
            subtitle="P95 target: < 250ms"
            trend={stats.average_response_time < 200 ? 'up' : 'down'}
            trendValue={stats.average_response_time < 200 ? 'NOMINAL' : 'SLOW'}
            delay={100}
            onClick={() => navigate('/analytics')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            icon={Bell}
            title="Active Incidents"
            value={stats.active_alerts}
            color={stats.active_alerts > 0 ? '#f43f5e' : '#10b981'}
            subtitle={`${stats.critical_or_down_services} critical/down services`}
            trend={stats.active_alerts > 0 ? 'down' : 'up'}
            trendValue={stats.active_alerts > 0 ? 'ATTENTION' : 'CLEAR'}
            delay={150}
            onClick={() => navigate('/alerts')}
          />
        </Grid>
      </Grid>

      {/* ── Real-Time Service Health Matrix (Block Bar) ─────────────── */}
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Radio size={18} color="#38bdf8" />
            <Typography variant="h6" fontWeight={700}>
              Live Service Mesh Matrix
            </Typography>
            <Chip
              label={`${services.length} Nodes`}
              size="small"
              sx={{
                bgcolor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.68rem',
              }}
            />
          </Box>
          <Button
            size="small"
            endIcon={<ArrowUpRight size={14} />}
            onClick={() => navigate('/services')}
            sx={{ color: '#38bdf8', fontSize: '0.8rem' }}
          >
            Manage Services
          </Button>
        </Box>

        {services.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No microservices registered yet.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {services.map((svc) => {
              const isHealthy = svc.status === 'healthy'
              const isCritical = svc.status === 'critical' || svc.status === 'down'
              const color = isHealthy ? '#10b981' : isCritical ? '#f43f5e' : '#f59e0b'

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={svc.id}>
                  <Box
                    onClick={() => navigate('/monitoring')}
                    sx={{
                      p: 1.8,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${color}35`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: 'rgba(15, 23, 42, 0.9)',
                        borderColor: color,
                        boxShadow: `0 6px 20px -4px ${color}30`,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{ maxWidth: '65%', color: '#f8fafc' }}
                      >
                        {svc.name}
                      </Typography>
                      <Chip
                        label={svc.status?.toUpperCase()}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          bgcolor: `${color}18`,
                          color: color,
                          border: `1px solid ${color}40`,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#94a3b8',
                          fontSize: '0.72rem',
                        }}
                      >
                        Score: {svc.health_score ?? 100}%
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                        }}
                      >
                        {svc.response_time ? `${Math.round(svc.response_time)}ms` : 'Active'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Card>

      {/* ── Charts Row (Telemetry Trends & Health Breakdown) ────────── */}
      <Grid container spacing={2.5} mb={3}>
        {/* Response Time Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 360 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Response Latency Waveform
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Real-time network & server processing latency (sampled stream)
                  </Typography>
                </Box>

                {/* Range switchers */}
                <Stack direction="row" spacing={0.6}>
                  {[1, 6, 24].map((hours) => (
                    <Button
                      key={hours}
                      size="small"
                      variant={timeRange === hours ? 'contained' : 'outlined'}
                      onClick={() => setTimeRange(hours)}
                      sx={{
                        minWidth: 42,
                        py: 0.3,
                        px: 1,
                        fontSize: '0.72rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        bgcolor: timeRange === hours ? '#38bdf8' : 'transparent',
                        color: timeRange === hours ? '#040e1b' : '#94a3b8',
                        borderColor:
                          timeRange === hours ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {hours}h
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ flexGrow: 1, width: '100%', minHeight: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tick={{ fill: '#64748b' }}
                      unit="ms"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 19, 34, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                      formatter={(v: any) => [`${v} ms`, 'Latency']}
                    />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#latencyGlow)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Health Donut Chart */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 360 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700}>
                Service Status Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary" mb={1}>
                Cluster distribution across availability tiers
              </Typography>
              <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={62}
                      outerRadius={92}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 19, 34, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: 8,
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Stat Badge */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '44%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      lineHeight: 1,
                      color: '#f8fafc',
                    }}
                  >
                    {stats.total_services}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase' }}
                  >
                    Services
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── System Resources & Recent Incident Watchlist ─────────────── */}
      <Grid container spacing={2.5}>
        {/* Host Telemetry Gauges */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2.5 }}>
                <Gauge size={20} color="#38bdf8" />
                <Typography variant="h6" fontWeight={700}>
                  Host Infrastructure Telemetry
                </Typography>
              </Box>

              {/* Resource Bars */}
              <Box mb={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cpu size={15} color="#38bdf8" />
                    <Typography variant="body2" color="text.secondary">
                      CPU Utilization
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color:
                        stats.cpu_usage > 80
                          ? '#f43f5e'
                          : stats.cpu_usage > 60
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  >
                    {stats.cpu_usage?.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, stats.cpu_usage || 0)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        stats.cpu_usage > 80
                          ? '#f43f5e'
                          : stats.cpu_usage > 60
                          ? '#f59e0b'
                          : '#38bdf8',
                    },
                  }}
                />
              </Box>

              <Box mb={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Activity size={15} color="#a855f7" />
                    <Typography variant="body2" color="text.secondary">
                      RAM Usage
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color:
                        stats.ram_usage > 80
                          ? '#f43f5e'
                          : stats.ram_usage > 60
                          ? '#f59e0b'
                          : '#a855f7',
                    }}
                  >
                    {stats.ram_usage?.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, stats.ram_usage || 0)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        stats.ram_usage > 80
                          ? '#f43f5e'
                          : stats.ram_usage > 60
                          ? '#f59e0b'
                          : '#a855f7',
                    },
                  }}
                />
              </Box>

              <Box mb={2.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HardDrive size={15} color="#10b981" />
                    <Typography variant="body2" color="text.secondary">
                      Disk Storage
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color:
                        stats.disk_usage > 80
                          ? '#f43f5e'
                          : stats.disk_usage > 60
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  >
                    {stats.disk_usage?.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, stats.disk_usage || 0)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        stats.disk_usage > 80
                          ? '#f43f5e'
                          : stats.disk_usage > 60
                          ? '#f59e0b'
                          : '#10b981',
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

              <Stack spacing={1.2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Memory Available
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {stats.memory_available_gb?.toFixed(1)} GB free
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Storage Free
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {stats.disk_free_gb?.toFixed(1)} GB free
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Network In / Out
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {stats.network_in_mb?.toFixed(1)} MB / {stats.network_out_mb?.toFixed(1)} MB
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Live SLA Watchlist & Recent Incidents */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <ShieldCheck size={20} color="#38bdf8" />
                  <Typography variant="h6" fontWeight={700}>
                    SLA Incident Feed & Watchlist
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowUpRight size={14} />}
                  onClick={() => navigate('/alerts')}
                  sx={{ color: '#38bdf8', fontSize: '0.8rem' }}
                >
                  View All Alerts
                </Button>
              </Box>

              {recentAlerts.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CheckCircle2 size={40} color="#10b981" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    All Systems Nominal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No active SLA breaches, degraded endpoints, or incident warnings detected.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {recentAlerts.map((alert) => {
                    const isCritical = alert.severity === 'critical'
                    const isHigh = alert.severity === 'high'
                    const borderColor = isCritical ? '#f43f5e' : isHigh ? '#f59e0b' : '#38bdf8'

                    return (
                      <Box
                        key={alert.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.8,
                          borderRadius: 2.5,
                          bgcolor: 'rgba(15, 23, 42, 0.65)',
                          borderLeft: `4px solid ${borderColor}`,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(15, 23, 42, 0.95)',
                            transform: 'translateX(3px)',
                          },
                        }}
                      >
                        <Box sx={{ flexGrow: 1, minWidth: 0, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {alert.title}
                            </Typography>
                            {alert.metric_name?.startsWith('predicted') && (
                              <Chip
                                label="AI PREDICTION"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  bgcolor: 'rgba(168, 85, 247, 0.18)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {alert.service_name} • {alert.description}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={alert.severity?.toUpperCase()}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              fontFamily: 'JetBrains Mono, monospace',
                              bgcolor: `${borderColor}18`,
                              color: borderColor,
                              border: `1px solid ${borderColor}40`,
                            }}
                          />
                          <Chip
                            label={alert.status}
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.65rem' }}
                          />
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
