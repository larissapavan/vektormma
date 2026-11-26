import type { SVGProps } from 'react'

export const SOCIAL_LINKS = {
  youtube: {
    url: 'https://www.youtube.com/@Vektor-MMA',
    handle: '@Vektor-MMA',
    label: 'YouTube',
  },
  instagram: {
    url: 'https://www.instagram.com/vektormma',
    handle: '@vektormma',
    label: 'Instagram',
  },
  tiktok: {
    url: 'https://www.tiktok.com/@vektormma',
    handle: '@vektormma',
    label: 'TikTok',
  },
  github: {
    url: 'https://github.com/larissapavan/vektormma',
    handle: 'larissapavan/vektormma',
    label: 'GitHub',
  },
} as const

export function YouTubeIcon({ className = 'h-4 w-4', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export function InstagramIcon({ className = 'h-4 w-4', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function TikTokIcon({ className = 'h-4 w-4', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68 6.34 6.34 0 0 0 9.35 22a6.33 6.33 0 0 0 6.34-6.32V9.08a8.28 8.28 0 0 0 4.84 1.57v-3.5a4.84 4.84 0 0 1-.94-.46z" />
    </svg>
  )
}

interface SocialLinksProps {
  className?: string
  iconClassName?: string
  showLabels?: boolean
  /** Adds the project's GitHub repository after the social channels (the footer carries it). */
  withGithub?: boolean
}

export function GitHubIcon({ className = 'h-4 w-4', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

export function SocialLinks({ className = 'flex items-center gap-1.5', iconClassName = 'h-4 w-4', showLabels = false, withGithub = false }: SocialLinksProps) {
  const items = [
    {
      ...SOCIAL_LINKS.youtube,
      icon: YouTubeIcon,
      hoverColor: 'hover:text-[var(--ink)] hover:bg-[var(--panel)]',
    },
    {
      ...SOCIAL_LINKS.instagram,
      icon: InstagramIcon,
      hoverColor: 'hover:text-[var(--ink)] hover:bg-[var(--panel)]',
    },
    {
      ...SOCIAL_LINKS.tiktok,
      icon: TikTokIcon,
      hoverColor: 'hover:text-[var(--ink)] hover:bg-[var(--panel)]',
    },
    ...(withGithub ? [{ ...SOCIAL_LINKS.github, icon: GitHubIcon, hoverColor: 'hover:text-[var(--ink)] hover:bg-[var(--panel)]' }] : []),
  ]

  return (
    <div className={className}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <a
            key={item.label}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${item.label} (${item.handle})`}
            title={`${item.label}: ${item.handle}`}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-sm p-1.5 text-[var(--text-secondary)] transition-colors duration-150 ${item.hoverColor} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]`}
          >
            <Icon className={iconClassName} />
            {showLabels && <span className="text-xs font-semibold">{item.label}</span>}
          </a>
        )
      })}
    </div>
  )
}
