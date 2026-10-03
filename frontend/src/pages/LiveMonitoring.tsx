import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import {
  Eye,
  Cpu,
  HardDrive,
  Activity,
  Search,
  RefreshCw,
  ExternalLink,
  Server,
} from 'lucide-react'
import api from '../services/api'

export default function LiveMonitoring() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/monitoring/live?per_page=100')
      setData(res.data.data || [])
    } catch (err) {
      console.error('Fetch monitoring error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return
    const interval = window.setInterval(fetchData, 5000)
    return () => window.clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'healthy') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
    if (s === 'degraded') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' }
    if (s === 'critical' || s === 'down') return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' }
    return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.service?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.service?.base_url?.toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        statusFilter === 'all' || item.service?.status?.toLowerCase() === statusFilter.toLowerCase()
      return matchSearch && matchStatus
    })
  }, [data, search, statusFilter])

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
              Live Telemetry Stream
            </Typography>
            <Chip
              label={autoRefresh ? 'POLLING (5s)' : 'PAUSED'}
              size="small"
              sx={{
                bgcolor: autoRefresh ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: autoRefresh ? '#34d399' : '#fb7185',
                border: `1px solid ${autoRefresh ? '#10b981' : '#f43f5e'}40`,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: '0.68rem',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Continuous sub-second ping metrics, host telemetry, and live SLA health evaluation.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {autoRefresh ? 'Pause Stream' : 'Resume Stream'}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchData}
            disabled={loading}
            sx={{
              fontSize: '0.78rem',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Refresh Now
          </Button>
        </Stack>
      </Box>

      {/* Filter Toolbar */}
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
          {/* Search Box */}
          <TextField
            size="small"
            placeholder="Filter by service name or URL endpoint..."
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

          {/* Status Filter Tabs */}
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
            {['all', 'healthy', 'degraded', 'critical', 'down'].map((st) => (
              <Chip
                key={st}
                label={st.toUpperCase()}
                clickable
                onClick={() => setStatusFilter(st)}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  bgcolor:
                    statusFilter === st
                      ? '#38bdf8'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: statusFilter === st ? '#040e1b' : '#94a3b8',
                  border:
                    statusFilter === st
                      ? '1px solid #38bdf8'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    bgcolor:
                      statusFilter === st
                        ? '#7dd3fc'
                        : 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Card>

      {/* Telemetry Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service Endpoint</TableCell>
                <TableCell>Health Status</TableCell>
                <TableCell>Latency (RT)</TableCell>
                <TableCell>SLA Health Score</TableCell>
                <TableCell>CPU Usage</TableCell>
                <TableCell>RAM Memory</TableCell>
                <TableCell>Storage</TableCell>
                <TableCell align="right">Diagnostics</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      No services match the current filter criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const statusStyle = getStatusColor(item.service.status)
                  const rt = item.latest_log?.response_time
                  const rtColor =
                    rt === undefined
                      ? '#94a3b8'
                      : rt < 150
                      ? '#10b981'
                      : rt < 400
                      ? '#f59e0b'
                      : '#f43f5e'

                  return (
                    <TableRow
                      key={item.service.id}
                      hover
                      sx={{
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                          bgcolor: 'rgba(56, 189, 248, 0.04) !important',
                        },
                      }}
                    >
                      {/* Name & URL */}
                      <TableCell>
                        <Typography fontWeight={700} sx={{ color: '#f8fafc', fontSize: '0.88rem' }}>
                          {item.service.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#64748b',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.72rem',
                          }}
                        >
                          {item.service.base_url}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={item.service.status?.toUpperCase()}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            bgcolor: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.color}40`,
                          }}
                        />
                      </TableCell>

                      {/* Latency */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography
                            fontWeight={700}
                            sx={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.85rem',
                              color: rtColor,
                            }}
                          >
                            {rt ? `${Math.round(rt)}ms` : '—'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Health score */}
                      <TableCell>
                        <Box sx={{ width: 110 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{
                                fontFamily: 'JetBrains Mono, monospace',
                                color:
                                  item.service.health_score > 90
                                    ? '#10b981'
                                    : item.service.health_score > 75
                                    ? '#f59e0b'
                                    : '#f43f5e',
                              }}
                            >
                              {item.service.health_score}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.service.health_score ?? 100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              '& .MuiLinearProgress-bar': {
                                bgcolor:
                                  item.service.health_score > 90
                                    ? '#10b981'
                                    : item.service.health_score > 75
                                    ? '#f59e0b'
                                    : '#f43f5e',
                              },
                            }}
                          />
                        </Box>
                      </TableCell>

                      {/* CPU */}
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Cpu size={14} color="#38bdf8" />
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}
                          >
                            {item.latest_performance?.cpu_usage?.toFixed(1) ?? 0}%
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* RAM */}
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <Activity size={14} color="#a855f7" />
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}
                          >
                            {item.latest_performance?.ram_usage?.toFixed(1) ?? 0}%
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Disk */}
                      <TableCell>
                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <HardDrive size={14} color="#10b981" />
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}
                          >
                            {item.latest_performance?.disk_usage?.toFixed(1) ?? 0}%
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        <Tooltip title="View Endpoint Telemetry">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedItem(item)}
                            sx={{
                              color: '#38bdf8',
                              bgcolor: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              p: 0.8,
                              '&:hover': {
                                bgcolor: 'rgba(56, 189, 248, 0.2)',
                              },
                            }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Diagnostics Modal */}
      <Dialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Server size={22} color="#38bdf8" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {selectedItem?.service?.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}
              >
                {selectedItem?.service?.base_url}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ color: '#38bdf8' }}>
                    {selectedItem.service.status?.toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Response Latency
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {selectedItem.latest_log?.response_time
                      ? `${selectedItem.latest_log.response_time}ms`
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Health Score
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#10b981' }}
                  >
                    {selectedItem.service.health_score}%
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Host Performance Snapshot
                </Typography>
                <Stack spacing={1.5}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography variant="caption" color="text.secondary">
                        CPU
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {selectedItem.latest_performance?.cpu_usage ?? 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={selectedItem.latest_performance?.cpu_usage ?? 0}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography variant="caption" color="text.secondary">
                        RAM
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {selectedItem.latest_performance?.ram_usage ?? 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={selectedItem.latest_performance?.ram_usage ?? 0}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Disk
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {selectedItem.latest_performance?.disk_usage ?? 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={selectedItem.latest_performance?.disk_usage ?? 0}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedItem(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedItem?.service?.base_url) {
                window.open(selectedItem.service.base_url, '_blank')
              }
            }}
            endIcon={<ExternalLink size={14} />}
          >
            Visit URL
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}