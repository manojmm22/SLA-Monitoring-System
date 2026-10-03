import { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Grid,
  Stack,
  InputAdornment,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Plus,
  Trash2,
  Server,
  Search,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
} from 'lucide-react'
import api from '../services/api'
import { DataGrid, GridColDef } from '@mui/x-data-grid'

interface Service {
  id: number
  name: string
  base_url: string
  description?: string
  status: string
  health_score: number
  service_type?: string
  sla_target?: number
  is_active?: boolean
  created_at?: string
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const fetchServices = async () => {
    try {
      setLoading(true)
      const res = await api.get('/services/')
      setServices(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.base_url.trim()) return
    setSubmitting(true)
    try {
      await api.post('/services/', formData)
      setOpen(false)
      fetchServices()
      setFormData({ name: '', base_url: '', description: '' })
      setStatusMessage('Service registered successfully.')
      setTimeout(() => setStatusMessage(''), 4000)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create service')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to decommission service "${name}"?`)) {
      await api.delete(`/services/${id}`)
      fetchServices()
    }
  }

  const filteredServices = useMemo(() => {
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.base_url.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
    )
  }, [services, search])

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'healthy') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' }
    if (s === 'degraded') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' }
    if (s === 'critical' || s === 'down') return { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.14)' }
    return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' }
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Service Name',
      width: 220,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Typography fontWeight={700} sx={{ color: '#f8fafc', fontSize: '0.86rem' }}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.description || 'Microservice API'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'base_url',
      headerName: 'Endpoint URL',
      width: 320,
      renderCell: (params) => (
        <Typography
          sx={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.78rem',
            color: '#38bdf8',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => {
        const sc = getStatusColor(params.value)
        return (
          <Chip
            label={params.value?.toUpperCase()}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 800,
              fontFamily: 'JetBrains Mono, monospace',
              bgcolor: sc.bg,
              color: sc.color,
              border: `1px solid ${sc.color}40`,
            }}
          />
        )
      },
    },
    {
      field: 'health_score',
      headerName: 'SLA Score',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ width: '100%', pr: 2 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {params.value ?? 100}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={params.value ?? 100}
            sx={{
              height: 4,
              borderRadius: 2,
              '& .MuiLinearProgress-bar': {
                bgcolor: (params.value ?? 100) > 85 ? '#10b981' : '#f59e0b',
              },
            }}
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => window.open(params.row.base_url, '_blank')}
            sx={{ color: '#38bdf8' }}
          >
            <ExternalLink size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id, params.row.name)}
            sx={{ color: '#fb7185' }}
          >
            <Trash2 size={16} />
          </IconButton>
        </Box>
      ),
    },
  ]

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
              Service Mesh & Endpoints
            </Typography>
            <Chip
              label={`${services.length} ACTIVE`}
              size="small"
              sx={{
                bgcolor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.68rem',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Manage monitored microservices, configure health ping endpoints, and review SLA targets.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: 'flex',
              bgcolor: 'rgba(15, 23, 42, 0.7)',
              p: 0.5,
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <IconButton
              size="small"
              onClick={() => setViewMode('grid')}
              sx={{
                color: viewMode === 'grid' ? '#38bdf8' : '#94a3b8',
                bgcolor: viewMode === 'grid' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderRadius: 1.5,
              }}
            >
              <LayoutGrid size={18} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setViewMode('table')}
              sx={{
                color: viewMode === 'table' ? '#38bdf8' : '#94a3b8',
                bgcolor: viewMode === 'table' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderRadius: 1.5,
              }}
            >
              <ListIcon size={18} />
            </IconButton>
          </Box>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
            onClick={() => setOpen(true)}
            sx={{ fontSize: '0.85rem' }}
          >
            Register Service
          </Button>
        </Stack>
      </Box>

      {statusMessage && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
          {statusMessage}
        </Alert>
      )}

      {/* Search Bar */}
      <Card sx={{ p: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search by service name, endpoint URL, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color="#64748b" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 2,
              fontSize: '0.85rem',
            },
          }}
        />
      </Card>

      {/* Grid or Table View */}
      {viewMode === 'grid' ? (
        <Grid container spacing={2.5}>
          {filteredServices.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 6, textAlign: 'center' }}>
                <Server size={42} color="#64748b" style={{ marginBottom: 12 }} />
                <Typography variant="h6" fontWeight={700}>
                  No Services Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No registered endpoints match your search criteria.
                </Typography>
              </Card>
            </Grid>
          ) : (
            filteredServices.map((svc) => {
              const sc = getStatusColor(svc.status)
              return (
                <Grid item xs={12} sm={6} lg={4} key={svc.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        borderColor: 'rgba(56, 189, 248, 0.35)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        p: 2.5,
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              p: 1.2,
                              borderRadius: 2,
                              bgcolor: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                            }}
                          >
                            <Server size={20} />
                          </Box>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              sx={{ color: '#f8fafc', lineHeight: 1.2 }}
                            >
                              {svc.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#94a3b8',
                                display: 'block',
                                maxWidth: 180,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {svc.description || 'Autonomous Service'}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          label={svc.status?.toUpperCase()}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            bgcolor: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.color}40`,
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          bgcolor: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'JetBrains Mono, monospace',
                            color: '#38bdf8',
                            fontSize: '0.74rem',
                            wordBreak: 'break-all',
                            display: 'block',
                          }}
                        >
                          {svc.base_url}
                        </Typography>
                      </Box>

                      {/* Health & SLA bar */}
                      <Box sx={{ mt: 'auto' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            SLA Health Score
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{
                              fontFamily: 'JetBrains Mono, monospace',
                              color: sc.color,
                            }}
                          >
                            {svc.health_score ?? 100}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={svc.health_score ?? 100}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: sc.color,
                            },
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Card Actions */}
                    <Box
                      sx={{
                        p: 1.5,
                        px: 2.5,
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: 'rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      <Button
                        size="small"
                        endIcon={<ExternalLink size={14} />}
                        onClick={() => window.open(svc.base_url, '_blank')}
                        sx={{ color: '#38bdf8', fontSize: '0.78rem' }}
                      >
                        Visit Endpoint
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(svc.id, svc.name)}
                        sx={{
                          color: '#fb7185',
                          p: 0.8,
                          '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.15)' },
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid>
              )
            })
          )}
        </Grid>
      ) : (
        <Card sx={{ p: 1 }}>
          <DataGrid
            rows={filteredServices}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(56, 189, 248, 0.08)',
              },
            }}
          />
        </Card>
      )}

      {/* Add Service Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Server size={22} color="#38bdf8" />
            <Typography variant="h6" fontWeight={800}>
              Register Monitored Service
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Service Name"
              placeholder="e.g. Payments Gateway API"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Base Endpoint URL"
              placeholder="e.g. https://api.stripe.com or http://localhost:8080/health"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Service Description"
              placeholder="Describe its role in your infrastructure"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name || !formData.base_url}
          >
            {submitting ? 'Registering...' : 'Register Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}