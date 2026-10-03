import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Card,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
} from '@mui/material'
import { RefreshCw } from 'lucide-react'
import api from '../services/api'

export default function Settings() {
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/settings/')
      setSettings(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleUpdate = async (key: string, value: any) => {
    const stringValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : value
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: stringValue } : s))
    )
    try {
      await api.put(`/settings/${key}`, { value: stringValue })
      setSaveStatus(`Updated "${key}" successfully.`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      fetchSettings()
    }
  }

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
              System Configuration & SLO Tuning
            </Typography>
            <Chip
              label="GLOBAL PARAMS"
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
            Configure telemetry polling frequencies, threshold triggers, and system automation flags.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          onClick={fetchSettings}
          disabled={loading}
          sx={{
            borderColor: 'rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.8rem',
          }}
        >
          Reload Settings
        </Button>
      </Box>

      {saveStatus && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {saveStatus}
        </Alert>
      )}

      {/* Settings Grid */}
      <Grid container spacing={2.5}>
        {settings.map((setting) => (
          <Grid item xs={12} md={6} key={setting.key}>
            <Card
              sx={{
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(56, 189, 248, 0.35)',
                },
              }}
            >
              <Box mb={2}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                    }}
                  >
                    {setting.key}
                  </Typography>
                  <Chip
                    label={setting.value_type?.toUpperCase() || 'STRING'}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94a3b8',
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
                  {setting.description || 'Configurable operational threshold parameter.'}
                </Typography>
              </Box>

              <Box sx={{ mt: 'auto' }}>
                {setting.value_type === 'bool' ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={setting.value === 'true'}
                        onChange={(e) => handleUpdate(setting.key, e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#38bdf8',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#38bdf8',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          color: setting.value === 'true' ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {setting.value === 'true' ? 'ACTIVE / ENABLED' : 'DISABLED'}
                      </Typography>
                    }
                  />
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    value={setting.value}
                    onChange={(e) => {
                      setSettings((prev) =>
                        prev.map((s) => (s.key === setting.key ? { ...s, value: e.target.value } : s))
                      )
                    }}
                    onBlur={(e) => handleUpdate(setting.key, e.target.value)}
                    disabled={!setting.is_editable}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(15, 23, 42, 0.65)',
                        borderRadius: 2,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.85rem',
                      },
                    }}
                  />
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}