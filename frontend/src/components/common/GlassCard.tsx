/**
 * GlassCard – reusable glassmorphism container with entrance animation.
 */
import { Card, CardContent, SxProps, Theme } from '@mui/material'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  sx?: SxProps<Theme>
  noPadding?: boolean
  onClick?: () => void
}

export default function GlassCard({ children, sx, noPadding, onClick }: GlassCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        animation: 'fadeSlideIn 0.4s ease-out',
        '@keyframes fadeSlideIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        ...sx,
      }}
    >
      {noPadding ? children : <CardContent>{children}</CardContent>}
    </Card>
  )
}
