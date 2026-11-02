import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { localeTag } from '../../../i18n/lang'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

/**
 * Counts up to `value` once it scrolls into view. Screen readers get the final number right away (the counting text is
 * hidden from them), people who ask for less motion see it without the count, and a changed `value` (the figure arriving
 * from the API) continues from what is on screen instead of restarting at zero.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1.4,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const { i18n } = useTranslation()
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isInView) return
    if (reduceMotion) {
      shown.current = value
      setDisplayValue(value)
      return
    }

    const from = shown.current
    let startTime: number | null = null
    let animationFrame: number

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      shown.current = from + (value - from) * easeProgress
      setDisplayValue(shown.current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        shown.current = value
        setDisplayValue(value)
      }
    }

    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, value, duration, reduceMotion])

  // Digits grouped and the decimal mark placed the way the language on screen writes them (25.656, 25,656, 25 656).
  const format = (n: number) =>
    new Intl.NumberFormat(localeTag(i18n.language), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span className="sr-only">
        {prefix}
        {format(value)}
        {suffix}
      </span>
      <span aria-hidden="true">
        {prefix}
        {format(displayValue)}
        {suffix}
      </span>
    </span>
  )
}
