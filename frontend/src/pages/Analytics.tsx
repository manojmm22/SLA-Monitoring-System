import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material'
import api from '../services/api'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Clock, Cpu, Zap } from 'lucide-react'
import KPICard from '../components/common/KPICard'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<number>(24)
  const [trendData, setTrendData] = useState<any[]>([])
  const [perfData, setPerfData] = useState<any[]>([])
  const [topSlow, setTopSlow] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async (hours = timeRange) => {
    try {
      setLoading(true)
      const [trendRes, slowRes] = await Promise.all([
        api.get(`/analytics/trends?hours=${hours}`),
        api.get('/analytics/top-slow'),
      ])

      const logs = trendRes.data.data.response_time_trend || []
      const sampledLogs = logs.filter((_: any, i: number) => i % 3 === 0).slice(-40)
      setTrendData(
        sampledLogs.map((log: any) => ({
          time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responseTime: Math.round(log.response_time || 0),
          statusCode: log.status_code,
        }))
      )

      const perf = trendRes.data.data.performance_trend || []
      const sampledPerf = perf.filter((_: any, i: number) => i % 3 === 0).slice(-40)
      setPerfData(
        sampledPerf.map((p: any) => ({
          time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: Math.round(p.cpu || 0),
          ram: Math.round(p.ram || 0),
          disk: Math.round(p.disk || 0),
        }))
      )

      setTopSlow(slowRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(timeRange)
  }, [timeRange])

  const avgLatency =
    trendData.length > 0
      ? Math.round(trendData.reduce((acc, d) => acc + d.responseTime, 0) / trendData.length)
      : 0

  const maxLatency =
    trendData.length > 0 ? Math.max(...trendData.map((d) => d.responseTime)) : 0

  const peakCpu = perfData.length > 0 ? Math.max(...perfData.map((d) => d.cpu)) : 0

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
              Observability & Analytics
            </Typography>
            <Chip
              label="TIME-SERIES TELEMETRY"
              size="small"
              sx={{
                bgcolor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 800,
                fontSize: '0.68rem',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            In-depth latency percentiles, hardware consumption trends, and slowest service rankings.
          </Typography>
        </Box>

        {/* Time Range Switchers */}
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={16} sx={{ color: '#38bdf8', mr: 1 }} />}
          {[1, 6, 24, 48].map((h) => (
            <Button
              key={h}
              variant={timeRange === h ? 'contained' : 'outlined'}
              size="small"
              disabled={loading}
              onClick={() => setTimeRange(h)}
              sx={{
                minWidth: 46,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.78rem',
              }}
            >
              {h}h
            </Button>
          ))}
        </Stack>
      </Box>

      {/* KPI Row */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={Clock}
            title="Window Avg Latency"
            value={avgLatency}
            suffix="ms"
            color="#38bdf8"
            subtitle={`Calculated across last ${timeRange} hours`}
            trend="up"
            trendValue="P50"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={Zap}
            title="Max Latency Spike"
            value={maxLatency}
            suffix="ms"
            color="#f43f5e"
            subtitle="Worst observed duration"
            trend={maxLatency > 500 ? 'down' : 'up'}
            trendValue="PEAK"
            delay={50}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={Cpu}
            title="Peak Host CPU"
            value={peakCpu}
            suffix="%"
            color="#a855f7"
            subtitle="Max system core saturation"
            delay={100}
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={2.5}>
        {/* Response Time Trend */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Response Latency Trend
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Millisecond response latency time-series
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, width: '100%', minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="analyticsLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 19, 34, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      formatter={(v: any) => [`${v} ms`, 'Response Time']}
                    />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#analyticsLatency)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Resource Usage Multi-Line */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Host Resource Saturation
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Correlated CPU, Memory & Disk utilization percentages
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1, width: '100%', minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={perfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 19, 34, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ram"
                      name="RAM"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="disk"
                      name="Disk"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Slow APIs */}
        <Grid item xs={12}>
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>
                Top Slowest Endpoints (Latency Bottlenecks)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Services requiring performance tuning and query optimization
              </Typography>
            </Box>

            {topSlow.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">No slow API telemetry detected.</Typography>
              </Box>
            ) : (
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSlow} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="service_name"
                      stroke="#64748b"
                      fontSize={11}
                      tick={{ fill: '#94a3b8' }}
                    />
                    <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 19, 34, 0.95)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      formatter={(v: any) => [`${v} ms`, 'Avg Latency']}
                    />
                    <Bar dataKey="average_response_time" radius={[6, 6, 0, 0]}>
                      {topSlow.map((entry, index) => {
                        const val = entry.average_response_time || 0
                        const color = val > 400 ? '#f43f5e' : val > 200 ? '#f59e0b' : '#38bdf8'
                        return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}