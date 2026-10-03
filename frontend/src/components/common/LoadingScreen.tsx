import { Box, CircularProgress, Typography } from '@mui/material'
import { Cpu } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        background: 'radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 35%)',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(20,184,166,0.95))',
          boxShadow: '0 0 40px rgba(99,102,241,0.32)',
        }}
      >
        <Cpu size={28} color="white" />
      </Box>
      <CircularProgress size={24} thickness={5} />
      <Typography variant="body2" color="text.secondary">
        Loading the SLA workspace...
      </Typography>
    </Box>
  )
}
