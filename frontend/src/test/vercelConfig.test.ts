import { describe, expect, it } from 'vitest'

import vercelFile from '../../vercel.json?raw'

interface Header {
  key: string
  value: string
}
interface HeaderRule {
  source: string
  headers: Header[]
}

const config = JSON.parse(vercelFile) as { headers: HeaderRule[] }

function headersFor(source: string): Record<string, string> {
  const rule = config.headers.find((entry) => entry.source === source)
  return Object.fromEntries((rule?.headers ?? []).map((header) => [header.key, header.value]))
}

describe('the response headers of the site', () => {
  const everything = headersFor('/(.*)')

  it('stop type sniffing, framing from other sites and the referrer going out in full', () => {
    expect(everything['X-Content-Type-Options']).toBe('nosniff')
    expect(everything['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(everything['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(everything['Permissions-Policy']).toContain('camera=()')
  })

  it('carry a policy that does not restrict where scripts, images or frames load from (AdSense needs them)', () => {
    const policy = everything['Content-Security-Policy']
    expect(policy).toContain("frame-ancestors 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).not.toMatch(/(^|;)\s*(default|script|img|frame|connect|style)-src/)
  })

  it('cache the hashed build files for a year and the images for a day', () => {
    expect(headersFor('/assets/(.*)')['Cache-Control']).toContain('immutable')
    expect(headersFor('/(og|fighter-photos)/(.*)')['Cache-Control']).toContain('max-age=86400')
  })
})
