/**
 * StatusIndicator – animated pulse dot showing service health.
 */
import { Box, Typography } from '@mui/material'

interface StatusIndicatorProps {
  status: string
  label?: string
  size?: number
}

const statusColors: Record<string, string> = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  critical: '#ef4444',
  down: '#ef4444',
  unknown: '#94a3b8',
}

export default function StatusIndicator({ status, label, size = 10 }: StatusIndicatorProps) {
  const color = statusColors[status?.toLowerCase()] || statusColors.unknown

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        {/* Animated pulse ring */}
        <Box
          sx={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.3,
            animation: status === 'healthy' ? 'none' : 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 0.3 },
              '50%': { transform: 'scale(1.8)', opacity: 0 },
            },
          }}
        />
        {/* Core dot */}
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
      </Box>
      {label && (
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color, textTransform: 'capitalize', fontSize: '0.75rem' }}
        >
          {label}
        </Typography>
      )}
    </Box>
  )
}
