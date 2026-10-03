import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material'
import {
  Bot,
  RefreshCw,
  Zap,
  Play,
  ShieldCheck,
} from 'lucide-react'
import api from '../services/api'
import KPICard from '../components/common/KPICard'

export default function Agents() {
  const [status, setStatus] = useState<any>(null)
  const [runningAgent, setRunningAgent] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchStatus = async () => {
    try {
      const res = await api.get('/agents/status')
      setStatus(res.data.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load agent status.')
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const runAgent = async (agentKey: string) => {
    setRunningAgent(agentKey)
    setError('')
    setSuccessMsg('')
    try {
      await api.post(`/agents/run/${agentKey}`)
      await fetchStatus()
      setSuccessMsg(`Agent "${agentKey}" executed successfully.`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.message || `Unable to run ${agentKey}.`)
    } finally {
      setRunningAgent(null)
    }
  }

  const runAllAgents = async () => {
    setRunningAll(true)
    setError('')
    setSuccessMsg('')
    try {
      for (const agent of agentList) {
        await api.post(`/agents/run/${agent.key}`)
      }
      await fetchStatus()
      setSuccessMsg('All 9 autonomous agents executed successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed while running agent cycle.')
    } finally {
      setRunningAll(false)
    }
  }

  const agentList = [
    {
      key: 'response_tracker',
      name: 'Response Tracker',
      color: '#38bdf8',
      desc: 'Monitors endpoint latency, status codes, and HTTP telemetry.',
    },
    {
      key: 'resource_monitor',
      name: 'Resource Monitor',
      color: '#10b981',
      desc: 'Samples host CPU, RAM, and Disk utilization every polling tick.',
    },
    {
      key: 'time_analyzer',
      name: 'Time Analyzer',
      color: '#f59e0b',
      desc: 'Analyzes latency variance, jitter, and time-series trends.',
    },
    {
      key: 'sla_checker',
      name: 'SLA Checker',
      color: '#f43f5e',
      desc: 'Evaluates availability percentages against SLA targets.',
    },
    {
      key: 'alert',
      name: 'Alert Dispatcher',
      color: '#8b5cf6',
      desc: 'Generates and dispatches alerts for SLA violations and warnings.',
    },
    {
      key: 'report',
      name: 'Report Generator',
      color: '#ec4899',
      desc: 'Aggregates historical metrics for PDF & CSV executive summaries.',
    },
    {
      key: 'recommendation',
      name: 'Recommendation Agent',
      color: '#14b8a6',
      desc: 'Suggests performance optimizations and infrastructure tuning.',
    },
    {
      key: 'prediction',
      name: 'AI Breach Predictor',
      color: '#06b6d4',
      desc: 'Runs ML models to forecast upcoming SLA breaches & overload.',
    },
    {
      key: 'recovery',
      name: 'Auto-Recovery Agent',
      color: '#f97316',
      desc: 'Executes autonomous restart and failover self-healing protocols.',
    },
  ]

  if (!status) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={42} sx={{ color: '#38bdf8' }} />
      </Box>
    )
  }

  const totalRuns = Object.values(status.agents || {}).reduce(
    (acc: number, a: any) => acc + (a.run_count || 0),
    0
  )

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
              Autonomous Agent Orchestrator
            </Typography>
            <Chip
              label="9 ACTIVE WORKERS"
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
            Continuous background telemetry collection, real-time SLA verification, and autonomous
            remediation.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            onClick={fetchStatus}
            sx={{
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.8rem',
            }}
          >
            Refresh Status
          </Button>
          <Button
            variant="contained"
            startIcon={
              runningAll ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Play size={16} fill="currentColor" />
              )
            }
            onClick={runAllAgents}
            disabled={runningAll || runningAgent !== null}
            sx={{
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#030d1a',
              fontWeight: 800,
              fontSize: '0.8rem',
            }}
          >
            {runningAll ? 'Executing Cycle...' : 'Run All Agents Now'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* KPI Stats */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={Bot}
            title="Total Registered Workers"
            value={agentList.length}
            color="#38bdf8"
            subtitle="Autonomous telemetry units"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={Zap}
            title="Total Executions Dispatched"
            value={totalRuns}
            color="#10b981"
            subtitle="Background agent operations"
            delay={50}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={ShieldCheck}
            title="Orchestrator Mode"
            value="Autonomous"
            color="#a855f7"
            subtitle="Continuous event loop active"
            delay={100}
          />
        </Grid>
      </Grid>

      {/* Agents Grid */}
      <Grid container spacing={2.5}>
        {agentList.map((agent) => {
          const agentStatus = status.agents?.[agent.key]
          const isRunning = runningAgent === agent.key || agentStatus?.is_running
          const lastRunText = agentStatus?.last_run
            ? new Date(agentStatus.last_run).toLocaleTimeString()
            : 'Pending'

          return (
            <Grid item xs={12} md={6} lg={4} key={agent.key}>
              <Card
                sx={{
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  borderLeft: `4px solid ${agent.color}`,
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 12px 30px -8px rgba(0, 0, 0, 0.5), 0 0 16px -4px ${agent.color}30`,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: `${agent.color}15`,
                      color: agent.color,
                      border: `1px solid ${agent.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={22} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc' }}>
                      {agent.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#94a3b8',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.68rem',
                      }}
                    >
                      {agent.key}
                    </Typography>
                  </Box>
                  <Chip
                    label={isRunning ? 'RUNNING' : 'IDLE'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      bgcolor: isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isRunning ? '#34d399' : '#94a3b8',
                      border: `1px solid ${isRunning ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}40`,
                    }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: '0.82rem', mb: 2, flexGrow: 1 }}
                >
                  {agent.desc}
                </Typography>

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Run Count
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#f8fafc' }}
                    >
                      {agentStatus?.run_count || 0} cycles
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Last Execution
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontFamily: 'JetBrains Mono, monospace', color: agent.color }}
                    >
                      {lastRunText}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={
                    isRunning ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )
                  }
                  onClick={() => runAgent(agent.key)}
                  disabled={runningAgent !== null || runningAll}
                  sx={{
                    borderColor: `${agent.color}40`,
                    color: agent.color,
                    '&:hover': {
                      borderColor: agent.color,
                      bgcolor: `${agent.color}15`,
                    },
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.78rem',
                  }}
                >
                  {isRunning ? 'Processing...' : 'Run Agent Now'}
                </Button>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
