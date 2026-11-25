import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from '../shared/components/ErrorBoundary'
import { isChunkError, reloadOnce, reportError, resetErrorReports } from '../shared/services/errorReporter'

const post = vi.fn(async (...args: [string, RequestInit]) => (args.length ? new Response(null, { status: 204 }) : new Response()))

function failure(message: string, stack = `Error: ${message}\n    at Page (${window.location.origin}/assets/Page-1.js?v=secret:1:2)`) {
  const error = new Error(message)
  error.stack = stack
  return error
}

beforeEach(() => {
  resetErrorReports()
  post.mockClear()
  sessionStorage.clear()
  vi.stubGlobal('fetch', post)
})
afterEach(() => vi.unstubAllGlobals())

describe('reporting an error', () => {
  it('sends the technical facts, and nothing after a "?"', () => {
    window.history.replaceState(null, '', '/fighters?q=ana')
    expect(reportError('render', failure('x is undefined'), '', true)).toBe(true)
    const [url, init] = post.mock.calls[0]
    expect(url).toMatch(/\/client-errors$/)
    const body = JSON.parse(String(init.body)) as Record<string, string>
    expect(Object.keys(body).sort()).toEqual(['build', 'kind', 'language', 'message', 'path', 'stack'])
    expect(body).toMatchObject({ kind: 'render', message: 'x is undefined', path: '/fighters' })
    expect(JSON.stringify(body)).not.toMatch(/ana|secret/)
    window.history.replaceState(null, '', '/')
  })

  it('sends nothing outside the production build', () => {
    expect(reportError('render', failure('x'))).toBe(false)
    expect(post).not.toHaveBeenCalled()
  })

  it('reports each error once per visit, and no more than a handful', () => {
    expect(reportError('error', failure('same'), '', true)).toBe(true)
    expect(reportError('error', failure('same'), '', true)).toBe(false)
    for (let i = 0; i < 20; i += 1) reportError('error', failure(`other ${i}`), '', true)
    expect(post).toHaveBeenCalledTimes(5)
  })

  it.each([
    'ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'Network Error', 'Failed to fetch', 'Load failed', 'timeout of 60000ms exceeded', 'Request failed with status code 503',
  ])('leaves out what is not a bug of the site: %s', (message) => {
    expect(reportError('promise', failure(message), '', true)).toBe(false)
  })

  it('leaves out the code of extensions and of other sites', () => {
    expect(reportError('error', failure('a', 'Error: a\n at chrome-extension://abc/x.js:1:1'), '', true)).toBe(false)
    expect(reportError('error', failure('b', 'Error: b\n at https://ads.example/x.js:1:1'), '', true)).toBe(false)
    expect(reportError('promise', undefined, '', true)).toBe(false)
  })

  it('does not break when the report cannot be sent', async () => {
    post.mockRejectedValueOnce(new TypeError('offline'))
    expect(reportError('error', failure('c'), '', true)).toBe(true)
    await Promise.resolve()
  })
})

describe('a page left open while a new version is published', () => {
  it('is recognized in every browser’s words', () => {
    for (const message of ['Failed to fetch dynamically imported module: https://x/a.js', 'error loading dynamically imported module', 'Importing a module script failed.', 'Unable to preload CSS for /a.css']) {
      expect(isChunkError(failure(message)), message).toBe(true)
    }
    expect(isChunkError(failure('x is undefined'))).toBe(false)
  })

  it('reloads once, and not in a loop', () => {
    const reload = vi.fn()
    expect(reloadOnce(reload, 1_000_000)).toBe(true)
    expect(reloadOnce(reload, 1_010_000)).toBe(false)
    expect(reloadOnce(reload, 1_070_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })
})

describe('the page shown when another one breaks', () => {
  const Broken = () => {
    throw failure('broken page')
  }

  it('goes away when the visitor opens another page', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Broken /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    rerender(<ErrorBoundary resetKey="/b"><p>another page</p></ErrorBoundary>)
    expect(screen.getByText('another page')).toBeInTheDocument()
    quiet.mockRestore()
  })
})
