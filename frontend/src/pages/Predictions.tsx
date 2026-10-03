import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Zap,
  Search,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import api from '../services/api'
import KPICard from '../components/common/KPICard'

interface Prediction {
  service_id: number
  service_name: string
  sla_breach_probability: number
  predicted_response_time: number
  server_overload_probability: number
  confidence_score: number
  timestamp: string
  method: string
}

interface RootCause {
  service_id: number
  service_name: string
  status: string
  issue_detected: boolean
  root_cause: string
  evidence: string
  confidence_score: number
  recommendations: string[]
}

const ProbabilityBar = ({ value, label }: { value: number; label: string }) => {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? '#f43f5e' : pct >= 40 ? '#f59e0b' : '#10b981'
  return (
    <Box mb={1.8}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.74rem' }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}
        >
          {pct}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            borderRadius: 4,
          },
        }}
      />
    </Box>
  )
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [rcaService, setRcaService] = useState<any | null>(null)
  const [rcaData, setRcaData] = useState<RootCause | null>(null)
  const [rcaLoading, setRcaLoading] = useState(false)
  const [services, setServices] = useState<any[]>([])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [predRes, svcRes] = await Promise.all([
        api.get('/predictions/'),
        api.get('/services/'),
      ])
      setPredictions(predRes.data.data || {})
      setServices(svcRes.data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = window.setInterval(fetchAll, 6000)
    return () => window.clearInterval(interval)
  }, [])

  const handleRCA = async (service: any) => {
    setRcaService(service)
    setRcaData(null)
    setRcaLoading(true)
    try {
      const res = await api.get(`/predictions/root-cause/${service.id}`)
      setRcaData(res.data.data)
    } finally {
      setRcaLoading(false)
    }
  }

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      await api.post('/predictions/retrain')
      await fetchAll()
    } finally {
      setRetraining(false)
    }
  }

  const predList = Object.values(predictions)
  const criticalCount = predList.filter((p) => p.sla_breach_probability >= 0.7).length
  const warningCount = predList.filter(
    (p) => p.sla_breach_probability >= 0.4 && p.sla_breach_probability < 0.7
  ).length
  const healthyCount = predList.filter((p) => p.sla_breach_probability < 0.4).length

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
              AI SLA Breach Predictor
            </Typography>
            <Chip
              icon={<Sparkles size={12} />}
              label="RANDOM FOREST ML"
              size="small"
              sx={{
                bgcolor: 'rgba(168, 85, 247, 0.18)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                fontWeight: 800,
                fontSize: '0.68rem',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Predictive anomaly forecasting, proactive SLA breach prevention, and AI root cause
            analysis (RCA).
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={14} className={retraining ? 'animate-spin' : ''} />}
            onClick={handleRetrain}
            disabled={retraining || loading}
            sx={{
              borderColor: 'rgba(168, 85, 247, 0.35)',
              color: '#c084fc',
              fontSize: '0.8rem',
            }}
          >
            {retraining ? 'Retraining ML...' : 'Retrain Models'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Brain size={16} />}
            onClick={fetchAll}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)',
              color: '#ffffff',
              fontSize: '0.8rem',
            }}
          >
            Refresh Predictions
          </Button>
        </Stack>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={ShieldAlert}
            title="High Breach Risk (≥70%)"
            value={criticalCount}
            color="#f43f5e"
            subtitle="Immediate mitigation suggested"
            trend={criticalCount > 0 ? 'down' : 'up'}
            trendValue={criticalCount > 0 ? 'RISK' : 'SAFE'}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={AlertTriangle}
            title="Elevated Risk (40–70%)"
            value={warningCount}
            color="#f59e0b"
            subtitle="Traffic surge anomaly warning"
            delay={50}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard
            icon={CheckCircle}
            title="Nominal / Low Risk (&lt;40%)"
            value={healthyCount}
            color="#10b981"
            subtitle="Stable SLA compliance projected"
            trend="up"
            trendValue="STABLE"
            delay={100}
          />
        </Grid>
      </Grid>

      {/* Predictions Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={42} sx={{ color: '#a855f7' }} />
        </Box>
      ) : predList.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Brain size={44} color="#a855f7" style={{ marginBottom: 12 }} />
          <Typography variant="h6" fontWeight={700}>
            No Predictive Telemetry Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ensure microservices are actively registered and receiving traffic.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {predList.map((pred) => {
            const breachPct = Math.round(pred.sla_breach_probability * 100)
            const svc = services.find((s) => s.id === pred.service_id)
            const riskColor =
              breachPct >= 70 ? '#f43f5e' : breachPct >= 40 ? '#f59e0b' : '#10b981'

            return (
              <Grid item xs={12} md={6} lg={4} key={pred.service_id}>
                <Card
                  sx={{
                    p: 2.5,
                    borderLeft: `5px solid ${riskColor}`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 14px 32px -8px rgba(0, 0, 0, 0.5), 0 0 16px -4px ${riskColor}35`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ minWidth: 0, pr: 1 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        noWrap
                        sx={{ color: '#f8fafc', fontSize: '0.96rem' }}
                      >
                        {pred.service_name}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.8,
                          mt: 0.6,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <Chip
                          label={
                            pred.method === 'random_forest' ? 'ML Random Forest' : 'Rule Engine'
                          }
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                            bgcolor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                          }}
                        />
                        {svc && (
                          <Chip
                            label={svc.status?.toUpperCase()}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              fontFamily: 'JetBrains Mono, monospace',
                              bgcolor:
                                svc.status === 'healthy'
                                  ? 'rgba(16, 185, 129, 0.14)'
                                  : 'rgba(244, 63, 94, 0.14)',
                              color: svc.status === 'healthy' ? '#34d399' : '#fb7185',
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Tooltip title="Run Deep Root Cause Analysis (RCA)">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleRCA(svc || { id: pred.service_id, name: pred.service_name })
                        }
                        sx={{
                          bgcolor: 'rgba(168, 85, 247, 0.12)',
                          color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          p: 1,
                          '&:hover': { bgcolor: 'rgba(168, 85, 247, 0.25)' },
                        }}
                      >
                        <Search size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Probability Progress Bars */}
                  <ProbabilityBar
                    value={pred.sla_breach_probability}
                    label="Projected SLA Breach Probability"
                  />
                  <ProbabilityBar
                    value={pred.server_overload_probability}
                    label="Server Overload / Memory Saturation Risk"
                  />

                  {/* Metrics Snapshot Pill */}
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Forecasted Response Time
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#f8fafc' }}
                      >
                        {Math.round(pred.predicted_response_time)} ms
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Model Confidence
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}
                      >
                        {pred.confidence_score}%
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      mt: 1.2,
                      display: 'block',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    Updated: {new Date(pred.timestamp).toLocaleTimeString()}
                  </Typography>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Root Cause Analysis Dialog */}
      <Dialog
        open={Boolean(rcaService)}
        onClose={() => {
          setRcaService(null)
          setRcaData(null)
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Brain size={24} color="#c084fc" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Root Cause Analysis (RCA) — {rcaService?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Autonomous diagnostic telemetry and remediation recommendations
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {rcaLoading ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 6,
                gap: 2,
              }}
            >
              <CircularProgress size={38} sx={{ color: '#c084fc' }} />
              <Typography variant="body2" color="text.secondary">
                Correlating metrics and evaluating anomaly chain…
              </Typography>
            </Box>
          ) : rcaData ? (
            <Stack spacing={2.5}>
              <Alert
                severity={
                  rcaData.issue_detected
                    ? rcaData.confidence_score >= 80
                      ? 'error'
                      : 'warning'
                    : 'success'
                }
                sx={{
                  borderRadius: 2.5,
                  '& .MuiAlert-message': { width: '100%' },
                }}
              >
                <Typography fontWeight={700} variant="subtitle2">
                  {rcaData.root_cause}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Forensic Confidence: {rcaData.confidence_score}%
                </Typography>
              </Alert>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Diagnostic Evidence Chain
                </Typography>
                <Card sx={{ bgcolor: 'rgba(15, 23, 42, 0.75)', p: 2 }}>
                  {rcaData.evidence.split('\n').map((line, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{
                        mb: 0.6,
                        color: '#cbd5e1',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                      }}
                    >
                      • {line}
                    </Typography>
                  ))}
                </Card>
              </Box>

              {rcaData.recommendations.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Recommended Remediation Actions
                  </Typography>
                  <Stack spacing={1}>
                    {rcaData.recommendations.map((rec, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(56, 189, 248, 0.06)',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                          alignItems: 'center',
                        }}
                      >
                        <Zap size={18} color="#38bdf8" />
                        <Typography variant="body2" sx={{ color: '#f8fafc', fontSize: '0.85rem' }}>
                          {rec}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setRcaService(null)
              setRcaData(null)
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
