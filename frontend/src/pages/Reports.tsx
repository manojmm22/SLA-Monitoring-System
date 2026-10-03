import { useEffect, useState } from 'react'
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
  Alert
} from '@mui/material'
import {
  Plus,
  Download,
  Trash2,
  FileText,
  Calendar,
  RefreshCw,
  HardDrive
} from 'lucide-react'
import api from '../services/api'

interface ReportItem {
  id: number
  user_id: number
  name: string
  description?: string
  report_type: string
  format: string
  status: string
  service_ids?: string
  file_path?: string
  file_size?: number
  download_count?: number
  created_at: string
  generated_at?: string
}

interface ServiceItem {
  id: number
  name: string
  service_type: string
  status: string
}

export default function Reports() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'daily',
    format: 'pdf',
    service_ids: [] as number[],
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    fetchReports()
    fetchServices()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/')
      const data = res.data?.data || []
      setReports(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load reports', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const res = await api.get('/services/')
      const data = res.data?.data || []
      setServices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load services', err)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setAlertInfo(null)
    try {
      const payload: any = {
        name: formData.name.trim() || undefined,
        description: formData.description.trim() || undefined,
        report_type: formData.report_type,
        format: formData.format,
        service_ids: formData.service_ids.length > 0 ? formData.service_ids : undefined
      }

      if (formData.report_type === 'custom') {
        if (formData.start_date) payload.start_date = formData.start_date
        if (formData.end_date) payload.end_date = formData.end_date
      }

      const res = await api.post('/reports/', payload)
      if (res.data?.success) {
        setAlertInfo({ type: 'success', message: 'Report generated successfully!' })
        setOpen(false)
        setFormData({
          name: '',
          description: '',
          report_type: 'daily',
          format: 'pdf',
          service_ids: [],
          start_date: '',
          end_date: ''
        })
        fetchReports()
      } else {
        setAlertInfo({ type: 'error', message: res.data?.message || 'Report generation failed.' })
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Report generation encountered an error.'
      setAlertInfo({ type: 'error', message: errMsg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (id: number, reportName: string, format: string) => {
    setDownloadingId(id)
    try {
      const response = await api.get(`/reports/${id}/download`, { responseType: 'blob' })
      const contentDisposition = (response.headers['content-disposition'] as string | undefined) || ''
      const match = contentDisposition.match(/filename="?([^";]+)"?/) || []
      const ext = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase()
      const fallbackName = `${reportName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${id}.${ext}`
      const filename = match[1] || fallbackName

      const contentType = (response.headers['content-type'] as string | undefined) || 'application/octet-stream'
      const blob = new Blob([response.data], { type: contentType })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      let message = 'Unable to download report file.'
      if (err?.response?.data) {
        try {
          const text = await new Response(err.response.data).text()
          const parsed = JSON.parse(text)
          if (parsed?.message) message = parsed.message
        } catch {
          // ignore parsing error
        }
      }
      setAlertInfo({ type: 'error', message })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return
    setDeletingId(id)
    try {
      await api.delete(`/reports/${id}`)
      setReports((prev) => prev.filter((r) => r.id !== id))
      setAlertInfo({ type: 'success', message: 'Report deleted successfully.' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete report.'
      setAlertInfo({ type: 'error', message: msg })
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: -0.5 }}>
            Executive Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and export comprehensive multi-format SLA compliance and system health reports.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
            onClick={fetchReports}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setAlertInfo(null)
              setOpen(true)
            }}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {alertInfo && (
        <Alert
          severity={alertInfo.type}
          onClose={() => setAlertInfo(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Reports Grid */}
      {loading && reports.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : reports.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed', borderColor: 'divider' }}>
          <FileText size={48} style={{ opacity: 0.4, marginBottom: 16 }} />
          <Typography variant="h6" fontWeight={600} color="text.primary">
            No reports generated yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 420, mx: 'auto' }}>
            Click &quot;Generate Report&quot; to produce an SLA audit report with executive metrics, resource charts, and AI insights.
          </Typography>
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpen(true)}>
            Generate First Report
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {reports.map((report) => {
            const isCompleted = report.status?.toLowerCase() === 'completed'
            const isFailed = report.status?.toLowerCase() === 'failed'
            const isGenerating = report.status?.toLowerCase() === 'generating' || report.status?.toLowerCase() === 'pending'

            return (
              <Grid item xs={12} md={6} key={report.id}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ pr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <FileText size={18} style={{ color: '#2563eb' }} />
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
                          {report.name || `Report #${report.id}`}
                        </Typography>
                      </Box>
                      {report.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.85rem' }}>
                          {report.description}
                        </Typography>
                      )}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {isCompleted && (
                        <Tooltip title="Download Report">
                          <span>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleDownload(report.id, report.name, report.format)}
                              disabled={downloadingId === report.id}
                            >
                              {downloadingId === report.id ? <CircularProgress size={18} /> : <Download size={18} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete Report">
                        <span>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(report.id)}
                            disabled={deletingId === report.id}
                          >
                            {deletingId === report.id ? <CircularProgress size={18} color="error" /> : <Trash2 size={18} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Metadata Chips */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip
                      label={report.report_type?.toUpperCase() || 'REPORT'}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    <Chip
                      label={report.format?.toUpperCase() || 'PDF'}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: 'action.hover' }}
                    />
                    <Chip
                      label={report.status?.toUpperCase() || 'UNKNOWN'}
                      color={isCompleted ? 'success' : isFailed ? 'error' : 'warning'}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </Box>

                  {/* Details Footer */}
                  <Box
                    sx={{
                      pt: 1.5,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      fontSize: '0.78rem',
                      color: 'text.secondary'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar size={14} />
                      <span>{formatDate(report.created_at)}</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <HardDrive size={14} />
                      <span>{formatFileSize(report.file_size)}</span>
                    </Box>
                    {isGenerating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                        <CircularProgress size={12} color="warning" />
                        <span>Generating...</span>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Generate Executive SLA Report</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Report Title"
            placeholder="e.g., Weekly SLA Performance Summary"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            disabled={submitting}
          />

          <TextField
            fullWidth
            label="Description (Optional)"
            placeholder="e.g., Prepared for leadership quarterly SLA review"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            disabled={submitting}
          />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Timeframe / Type</InputLabel>
                <Select
                  value={formData.report_type}
                  label="Timeframe / Type"
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                  disabled={submitting}
                >
                  <MenuItem value="all_time">All Time (Full Telemetry History)</MenuItem>
                  <MenuItem value="live">Live (Last 1 Hour)</MenuItem>
                  <MenuItem value="daily">Daily (Last 24 Hours)</MenuItem>
                  <MenuItem value="weekly">Weekly (Last 7 Days)</MenuItem>
                  <MenuItem value="monthly">Monthly (Last 30 Days)</MenuItem>
                  <MenuItem value="custom">Custom Date Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={formData.format}
                  label="Export Format"
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  disabled={submitting}
                >
                  <MenuItem value="pdf">PDF Document (.pdf)</MenuItem>
                  <MenuItem value="excel">Excel Workbook (.xlsx)</MenuItem>
                  <MenuItem value="csv">CSV Spreadsheet (.csv)</MenuItem>
                  <MenuItem value="json">Structured Data (.json)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Service Scope Selector */}
          <FormControl fullWidth sx={{ mt: 2.5 }}>
            <InputLabel>Monitored Services Scope</InputLabel>
            <Select
              multiple
              value={formData.service_ids}
              label="Monitored Services Scope"
              onChange={(e) => {
                const val = e.target.value
                setFormData({ ...formData, service_ids: typeof val === 'string' ? [] : val })
              }}
              renderValue={(selected) => {
                if (selected.length === 0) return 'All Active Services'
                return selected
                  .map((id) => services.find((s) => s.id === id)?.name || `Service #${id}`)
                  .join(', ')
              }}
              disabled={submitting}
            >
              {services.map((svc) => (
                <MenuItem key={svc.id} value={svc.id}>
                  {svc.name} ({svc.service_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Custom Date Range Pickers */}
          {formData.report_type === 'custom' && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={submitting}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <FileText size={16} />}
          >
            {submitting ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}