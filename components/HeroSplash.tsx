'use client'

import { useTheme } from '@/providers/ThemeProvider'

// Interior radial light for the hero slab. Two gradients mirror the ambient
// blobs behind the glass: a brand-red glow and a secondary tint for depth.
// Dark mode lights the primary hot on the ink; light mode softens the red and
// swaps the ink fill for the cool ambient blue so it reads on paper.
export const DARK_SPLASH =
  'radial-gradient(45rem 30rem at 78% 18%, oklch(from var(--primary) l c h / 55%), transparent 62%),' +
  'radial-gradient(38rem 28rem at 10% 92%, oklch(from var(--ink) l c h / 45%), transparent 60%)'

export const LIGHT_SPLASH =
  'radial-gradient(45rem 30rem at 78% 18%, oklch(from var(--primary) l c h / 18%), transparent 62%),' +
  'radial-gradient(38rem 28rem at 10% 92%, oklch(from var(--ambient-2) l c h / 25%), transparent 60%)'

interface HeroSplashProps {
  /** Geometry + spacing classes. The slab background/text are theme-aware. */
  className?: string
  children?: React.ReactNode
}

// Shared hero slab used by the landing, apply, and project pages. It is a
// single theme-aware surface — dark ink in dark mode, white paper in light —
// with the interior radial splash behind the content. Content should use
// text-current/* for any muted text so it follows the slab's tone.
export const HeroSplash: React.FC<HeroSplashProps> = ({ className = '', children }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section
      className={`relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-ink text-white' : 'bg-card text-foreground'} ${className}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: isDark ? DARK_SPLASH : LIGHT_SPLASH }}
      />
      {children}
    </section>
  )
}

export default HeroSplash
