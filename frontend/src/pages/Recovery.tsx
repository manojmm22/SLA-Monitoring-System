import { useEffect, useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, LinearProgress, Alert, Switch, FormControlLabel,
  Stack, Divider, Tooltip, CircularProgress
} from '@mui/material'
import {
  RefreshCw, ShieldCheck, Play, History, Zap, Bot, Cpu,
  Sparkles, Activity, CheckCircle2, RotateCcw, Layers, FlaskConical,
  Wrench
} from 'lucide-react'
import api from '../services/api'

interface RecoveryLog {
  id: number
  service_id: number
  service_name: string
  action_type: string
  description: string
  status: string
  triggered_by: string
  trigger_reason: string
  execution_time: number
  result_message: string
  started_at: string
  completed_at: string
}

interface RecoveryAction {
  key: string
  label: string
}

interface ServiceItem {
  id: number
  name: string
  status: string
  base_url?: string
  service_type?: string
  is_active?: boolean
}

interface AgentStatus {
  agent_id?: string
  name?: string
  type?: string
  is_running?: boolean
  last_run?: string
  run_count?: number
}

interface RecoveryStatusData {
  auto_recovery_enabled: boolean
  total_actions: number
  completed: number
  failed: number
  agent_automated: number
  manual: number
  auto_remediation_ratio: string
  supported_protocols: string[]
  active_services_count: number
  agent_status?: AgentStatus
}

const statusColor = (status: string) => {
  const m: Record<string, any> = {
    completed: 'success', failed: 'error', in_progress: 'warning',
    pending: 'default', skipped: 'info'
  }
  return m[status] || 'default'
}

export default function Recovery() {
  const [logs, setLogs] = useState<RecoveryLog[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [actions, setActions] = useState<RecoveryAction[]>([])
  const [statusData, setStatusData] = useState<RecoveryStatusData | null>(null)

  const [loading, setLoading] = useState(false)
  const [autoHealing, setAutoHealing] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [healingServiceId, setHealingServiceId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null)

  // Manual fallback dialog
  const [execDialog, setExecDialog] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [execResult, setExecResult] = useState<any>(null)
  const [execLoading, setExecLoading] = useState(false)

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchData, 6000)
    return () => clearInterval(interval)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchData(), fetchMeta()])
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      const [logRes, statusRes, svcRes] = await Promise.all([
        api.get('/recovery/history?per_page=100'),
        api.get('/recovery/status'),
        api.get('/services/')
      ])
      setLogs(logRes.data.data || [])
      setStatusData(statusRes.data.data || null)
      setServices(svcRes.data.data || [])
    } catch (e) {
      console.error('Failed to poll recovery data', e)
    }
  }

  const fetchMeta = async () => {
    try {
      const actRes = await api.get('/recovery/actions')
      setActions(actRes.data.data || [])
    } catch (e) {
      console.error('Failed to fetch actions metadata', e)
    }
  }

  // Trigger 1: Global Autonomous Auto-Heal (Zero Manual Input)
  const handleAutonomousHeal = async () => {
    setAutoHealing(true)
    setFeedback(null)
    try {
      const res = await api.post('/recovery/auto-heal')
      const data = res.data.data
      setFeedback({
        type: 'success',
        title: 'Autonomous Self-Healing Completed',
        message: res.data.message || `AI Agent evaluated cluster and restored ${data.actions_count} service(s) to healthy.`
      })
      await fetchData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'Autonomous Scan Issue',
        message: err.response?.data?.message || 'Autonomous healing scan encountered an error.'
      })
    } finally {
      setAutoHealing(false)
    }
  }

  // Trigger 2: Simulate Incident & Watch Agent Autonomously Heal
  const handleSimulateAndHeal = async (serviceId?: number) => {
    setSimulating(true)
    setFeedback(null)
    try {
      const res = await api.post('/recovery/simulate-issue', { service_id: serviceId })
      setFeedback({
        type: 'success',
        title: 'Incident Injected & Autonomously Healed',
        message: res.data.message || 'Incident was detected, diagnosed, and resolved by the AI Agent.'
      })
      await fetchData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'Simulation Error',
        message: err.response?.data?.message || 'Failed to execute incident simulation.'
      })
    } finally {
      setSimulating(false)
    }
  }

  // Trigger 3: 1-Click Targeted Self-Healing for a single service
  const handleHealSingleService = async (serviceId: number, serviceName: string) => {
    setHealingServiceId(serviceId)
    setFeedback(null)
    try {
      const res = await api.post(`/recovery/execute/${serviceId}`, {})
      setFeedback({
        type: 'success',
        title: `Service Healed: ${serviceName}`,
        message: res.data.message || `Autonomous self-healing protocol executed successfully on ${serviceName}.`
      })
      await fetchData()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: `Healing Failed: ${serviceName}`,
        message: err.response?.data?.message || 'Failed to heal service.'
      })
    } finally {
      setHealingServiceId(null)
    }
  }

  // Toggle background autonomous mode
  const handleToggleAuto = async () => {
    try {
      const res = await api.post('/recovery/toggle-auto')
      if (res.data?.data) {
        setStatusData(prev => prev ? { ...prev, auto_recovery_enabled: res.data.data.auto_recovery_enabled } : prev)
      }
    } catch (e) {
      console.error('Failed to toggle auto recovery', e)
    }
  }

  // Manual fallback execution
  const handleExecuteManual = async () => {
    if (!selectedService || !selectedAction) return
    setExecLoading(true)
    setExecResult(null)
    try {
      const res = await api.post(`/recovery/execute/${selectedService}`, {
        action: selectedAction,
        reason: 'Manual operator override intervention'
      })
      setExecResult(res.data)
      fetchData()
    } catch (err: any) {
      setExecResult({ success: false, message: err.response?.data?.message || 'Execution failed' })
    } finally {
      setExecLoading(false)
    }
  }

  const agentStatus = statusData?.agent_status
  const agentAutomated = statusData?.agent_automated ?? logs.filter(l => l.triggered_by === 'agent').length
  const completedCount = statusData?.completed ?? logs.filter(l => l.status === 'completed').length
  const autoRatio = statusData?.auto_remediation_ratio ?? (logs.length > 0 ? `${Math.round((agentAutomated / logs.length) * 100)}%` : '100%')

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              Recovery Center
            </Typography>
            <Chip
              icon={<Bot size={14} />}
              label="Autonomous AI Self-Healing"
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontWeight: 700,
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Continuous self-healing system where AI agents autonomously detect, diagnose, and recover issues with zero human workflow.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={15} />}
            onClick={fetchAll}
            disabled={loading || autoHealing}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={autoHealing ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
            onClick={handleAutonomousHeal}
            disabled={autoHealing || simulating}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
              boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.35)',
              fontWeight: 700,
              px: 2.5
            }}
          >
            {autoHealing ? 'AI Agent Healing...' : 'Run Autonomous Auto-Heal Now'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={simulating ? <CircularProgress size={16} color="inherit" /> : <FlaskConical size={15} />}
            onClick={() => handleSimulateAndHeal()}
            disabled={autoHealing || simulating}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {simulating ? 'Simulating & Healing...' : '⚡ Test Issue & Self-Heal'}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Wrench size={14} />}
            onClick={() => { setExecDialog(true); setExecResult(null) }}
            sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,0.15)' }}
          >
            Manual Override
          </Button>
        </Stack>
      </Box>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<Bot size={20} />}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            {feedback.title}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {feedback.message}
          </Typography>
        </Alert>
      )}

      {/* Autonomous Self-Healing Hero Status Card */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(99, 102, 241, 0.4)'
                  }}
                >
                  <Bot size={24} color="#818cf8" />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                      AI Autonomous Recovery Agent
                    </Typography>
                    <Chip
                      size="small"
                      label={agentStatus?.is_running ? 'HEALING IN PROGRESS' : 'ACTIVE & MONITORING'}
                      color={agentStatus?.is_running ? 'warning' : 'success'}
                      sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Runs on a continuous closed-loop scheduler to automatically resolve degraded states
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1.5, mb: 2 }}>
                The Recovery Agent autonomously evaluates heartbeat pings, latency breaches, and active SLA threshold alerts.
                Upon detecting an anomaly, it self-heals services (Container restart, Pod auto-scaling, Memory purge, Connection pool recycling)
                and restores health to <strong style={{ color: '#10b981' }}>HEALTHY</strong> without operator intervention.
              </Typography>

              <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={statusData?.auto_recovery_enabled ?? true}
                      onChange={handleToggleAuto}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>
                      Autonomous Loop: <span style={{ color: (statusData?.auto_recovery_enabled ?? true) ? '#10b981' : '#f59e0b' }}>
                        {(statusData?.auto_recovery_enabled ?? true) ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </Typography>
                  }
                />
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Total Agent Runs: <strong>{agentStatus?.run_count ?? logs.length}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Last Execution: <strong>{agentStatus?.last_run ? new Date(agentStatus.last_run).toLocaleTimeString() : 'Active'}</strong>
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  bgcolor: 'rgba(15, 23, 42, 0.65)',
                  p: 2.5,
                  borderRadius: 2.5,
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
                  AUTONOMOUS HEALING TELEMETRY
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Auto-Remediation Ratio</Typography>
                    <Typography variant="h4" fontWeight={800} color="#10b981">{autoRatio}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Zero human effort</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Agent Autonomous Actions</Typography>
                    <Typography variant="h4" fontWeight={800} color="#818cf8">{agentAutomated}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Closed by AI Agent</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Successfully Restored</Typography>
                    <Typography variant="h5" fontWeight={700} color="#38bdf8">{completedCount}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Avg Response MTTR</Typography>
                    <Typography variant="h5" fontWeight={700} color="#f472b6">&lt; 200ms</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Monitored Microservices Live Self-Healing Control Grid */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Activity size={18} color="#818cf8" />
            Monitored Microservices & Instant Self-Healing Triggers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click any service to trigger immediate autonomous self-healing or fault simulation
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {services.map((svc) => {
            const isUnhealthy = svc.status !== 'healthy'
            const isBusy = healingServiceId === svc.id
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={svc.id}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    bgcolor: isUnhealthy ? 'rgba(239, 68, 68, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                    border: isUnhealthy ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.07)',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 160 }}>
                        {svc.name}
                      </Typography>
                      <Chip
                        label={svc.status}
                        size="small"
                        color={svc.status === 'healthy' ? 'success' : svc.status === 'critical' || svc.status === 'down' ? 'error' : 'warning'}
                        sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700, height: 20 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 2 }}>
                      {svc.base_url || 'Internal API Gateway'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      color={isUnhealthy ? 'error' : 'primary'}
                      startIcon={isBusy ? <CircularProgress size={12} color="inherit" /> : <Zap size={12} />}
                      onClick={() => handleHealSingleService(svc.id, svc.name)}
                      disabled={isBusy}
                      sx={{ fontSize: '0.72rem', py: 0.5, fontWeight: 700, borderRadius: 1.5 }}
                    >
                      {isBusy ? 'Healing...' : isUnhealthy ? '⚡ Recover Now' : '⚡ Auto-Heal'}
                    </Button>
                    <Tooltip title="Inject simulated failure to test recovery agent">
                      <Button
                        variant="outlined"
                        size="small"
                        color="inherit"
                        onClick={() => handleSimulateAndHeal(svc.id)}
                        disabled={simulating || isBusy}
                        sx={{ minWidth: 36, px: 1, borderColor: 'rgba(255,255,255,0.15)' }}
                      >
                        <FlaskConical size={13} />
                      </Button>
                    </Tooltip>
                  </Stack>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>

      {/* Autonomous Self-Healing Protocols Matrix */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cpu size={18} color="#818cf8" />
          Autonomous Self-Healing Protocols Executed by AI Agents
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              title: 'Container Daemon Reboot',
              action: 'restart_service',
              desc: 'Autonomous restart of microservice process container upon heartbeat loss or DOWN detection.',
              trigger: 'Status: DOWN / Heartbeat Timeout',
              icon: <RotateCcw size={18} color="#ef4444" />,
              color: 'rgba(239, 68, 68, 0.1)'
            },
            {
              title: 'Horizontal Pod Auto-Scaling',
              action: 'scale_up',
              desc: 'Instantly provisions worker threads & compute instances during sustained CPU spikes.',
              trigger: 'CPU Breached > 85% / High Traffic',
              icon: <Layers size={18} color="#f59e0b" />,
              color: 'rgba(245, 158, 11, 0.1)'
            },
            {
              title: 'Cache & Buffer Invalidation',
              action: 'clear_cache',
              desc: 'Flushes Redis caches, system buffer pools, and stale memory segments automatically.',
              trigger: 'RAM > 90% or Disk I/O Saturation',
              icon: <Zap size={18} color="#10b981" />,
              color: 'rgba(16, 185, 129, 0.1)'
            },
            {
              title: 'Connection Pool Recycling',
              action: 'flush_connections',
              desc: 'Recycles idle sockets, resets database connection pools, and frees socket leaks.',
              trigger: 'Response Latency > SLA Threshold',
              icon: <Activity size={18} color="#3b82f6" />,
              color: 'rgba(59, 130, 246, 0.1)'
            }
          ].map((proto) => (
            <Grid item xs={12} sm={6} md={3} key={proto.action}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 2.5,
                  p: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: proto.color }}>
                    {proto.icon}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {proto.title}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, minHeight: 36 }}>
                  {proto.desc}
                </Typography>
                <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Auto-Trigger:
                  </Typography>
                  <Chip
                    label={proto.trigger}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(255,255,255,0.06)' }}
                  />
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Recovery History Table */}
      <Card sx={{ borderRadius: 2.5, bgcolor: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History size={18} />
            <Typography variant="h6" fontWeight={700}>Autonomous Recovery Audit Stream</Typography>
          </Box>
          <Chip
            label={`${logs.length} Total Executions`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}
          />
        </Box>
        {(loading || autoHealing || simulating) && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(15, 23, 42, 0.6)' }}>
                <TableCell>Service</TableCell>
                <TableCell>Healing Protocol</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Triggered By</TableCell>
                <TableCell>Execution Time</TableCell>
                <TableCell>Autonomous Diagnosis & Result</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography fontWeight={700} variant="body2">{log.service_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action_type?.replace(/_/g, ' ')}
                      size="small"
                      icon={<Zap size={12} />}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        bgcolor: 'rgba(99, 102, 241, 0.12)',
                        color: '#a5b4fc'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={statusColor(log.status)}
                      size="small"
                      icon={log.status === 'completed' ? <CheckCircle2 size={12} /> : undefined}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    {log.triggered_by === 'agent' ? (
                      <Chip
                        icon={<Bot size={12} />}
                        label="AI Agent"
                        size="small"
                        sx={{
                          bgcolor: 'rgba(139, 92, 246, 0.2)',
                          color: '#c084fc',
                          fontWeight: 700,
                          border: '1px solid rgba(139, 92, 246, 0.4)'
                        }}
                      />
                    ) : (
                      <Chip
                        label={log.triggered_by}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {log.execution_time ? `${(log.execution_time).toFixed(1)}ms` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {log.result_message || log.trigger_reason || 'Autonomous self-healing completed'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {log.started_at ? new Date(log.started_at).toLocaleString() : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <ShieldCheck size={40} color="#94a3b8" />
                    <Typography color="text.secondary" mt={1}>
                      No recovery actions recorded yet. All services running healthy.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Execute Recovery Dialog (Manual Override) */}
      <Dialog open={execDialog} onClose={() => setExecDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Play size={20} />
            <Typography variant="h6" fontWeight={700}>
              Manual Operator Override
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Autonomous self-healing normally resolves all issues automatically. Use this dialog only for manual testing or emergency operator override.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {execResult && (
            <Alert
              severity={execResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {execResult.message || (execResult.success ? 'Recovery action completed successfully' : 'Action failed')}
            </Alert>
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Service</InputLabel>
            <Select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              label="Select Service"
            >
              {services.map((svc) => (
                <MenuItem key={svc.id} value={svc.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={svc.status}
                      size="small"
                      color={svc.status === 'healthy' ? 'success' : svc.status === 'critical' ? 'error' : 'warning'}
                    />
                    {svc.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Recovery Action</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              label="Recovery Action"
            >
              {actions.map((act) => (
                <MenuItem key={act.key} value={act.key}>{act.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {execLoading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" mb={1}>Executing recovery workflow...</Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExecDialog(false)}>Close</Button>
          <Button
            onClick={handleExecuteManual}
            variant="contained"
            color="primary"
            disabled={!selectedService || !selectedAction || execLoading}
            startIcon={<Play size={16} />}
          >
            {execLoading ? 'Executing...' : 'Trigger Override'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
