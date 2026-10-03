/**
 * KPICard – Animated executive metric card with cubic easing,
 * vibrant gradient corner glow, trend indicator, and micro-interactions.
 */
import { useEffect, useState, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import GlassCard from './GlassCard'

interface KPICardProps {
  icon: any
  title: string
  value: number | string
  suffix?: string
  color: string
  subtitle?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  delay?: number
  onClick?: () => void
}

export default function KPICard({
  icon: Icon,
  title,
  value,
  suffix = '',
  color,
  subtitle,
  trend,
  trendValue,
  delay = 0,
  onClick,
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationRef = useRef<number>()

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
    const duration = 1000
    const start = performance.now()
    const startVal = 0

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(startVal + (numValue - startVal) * eased)
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    const timer = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timer)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [value, delay])

  const formattedValue = typeof value === 'string' && isNaN(Number(value))
    ? value
    : Number.isInteger(Number(value))
    ? Math.round(displayValue).toLocaleString()
    : displayValue.toFixed(1)

  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#f43f5e' : '#94a3b8'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <GlassCard
      onClick={onClick}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 14px 30px -8px rgba(0, 0, 0, 0.5), 0 0 16px -2px ${color}35`,
          borderColor: `${color}40`,
        },
      }}
    >
      {/* Corner ambient glow */}
      <Box
        sx={{
          position: 'absolute',
          top: -24,
          right: -24,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.1,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${color}22, ${color}08)`,
              border: `1px solid ${color}30`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${color}15`,
            }}
          >
            <Icon size={20} />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.82rem',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
        </Box>

        {trend && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.35,
              borderRadius: 1.5,
              backgroundColor: `${trendColor}15`,
              border: `1px solid ${trendColor}30`,
              color: trendColor,
            }}
          >
            <TrendIcon size={12} strokeWidth={2.5} />
            {trendValue && (
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {trendValue}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Typography
        variant="h4"
        fontWeight={800}
        sx={{
          lineHeight: 1.1,
          mb: 0.5,
          fontFamily: 'JetBrains Mono, "Plus Jakarta Sans", monospace',
          letterSpacing: '-0.02em',
          color: 'text.primary',
        }}
      >
        {formattedValue}
        {suffix && (
          <Typography
            component="span"
            variant="body1"
            sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}
          >
            {suffix}
          </Typography>
        )}
      </Typography>

      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            fontSize: '0.75rem',
            opacity: 0.9,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </GlassCard>
  )
}
