/**
 * ui-mobile host half: the PWA surface — index.html tap (manifest link, iOS
 * meta, boot skeleton, stripping host tags), the /pwa/ route (manifest JSON,
 * packaged icons, 404/405 handling), and the /sw.js route (app-shell service
 * worker whose cache strategies are exercised in a vm sandbox).
 */
import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { runInNewContext } from 'node:vm'
import { apply, buildServiceWorkerScript } from '../src/index.ts'
import type { Context } from '@deepseek-ai/cordis'

/** Collect what a handler wrote. */
class FakeRes {
  readonly writeHead = vi.fn((status: number, headers?: Record<string, string>) => { this.status = status; this.headers = headers })
  readonly end = vi.fn((body?: unknown) => { this.body = body })
  status = 200
  headers: Record<string, string> | undefined
  body: unknown
}

function fakeReq(method: string, url: string): IncomingMessage {
  return { method, url } as IncomingMessage
}

function makeCtx() {
  const taps: Array<(html: string) => string> = []
  const routes: Array<{ path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }> = []
  const ctx = {
    inject(services: string[], callback: (scope: unknown) => void): void {
      if (services.includes('webServer')) callback({
        effect(run: () => (() => void) | undefined): void { run() },
        webServer: {
          register(route: { path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }): () => void {
            routes.push({ path: route.path, handler: route.handler })
            return () => {}
          },
          tapIndex(tap: (html: string) => string): () => void {
            taps.push(tap)
            return () => {}
          },
        },
      })
    },
  } as unknown as Context
  return { ctx, taps, routes }
}

/** Route handler captured from apply() by exact path. */
function handlerFor(path: string): (req: IncomingMessage, res: ServerResponse) => Promise<void> | void {
  const { ctx, routes } = makeCtx()
  apply(ctx)
  const route = routes.find(r => r.path === path)
  if (route === undefined) throw new Error(`route ${path} not registered`)
  return route.handler
}

/** One captured index tap. */
function indexTap(): (html: string) => string {
  const { ctx, taps } = makeCtx()
  apply(ctx)
  return taps[0]!
}

interface SwSandbox {
  listeners: Record<string, Array<(event: unknown) => void>>
  /** Cache-name → (request url → response). */
  cacheVersions: Map<string, Map<string, unknown>>
  fetchCalls: string[]
  /** Replace the sandbox's fetch implementation (e.g. to simulate offline). */
  setFetch(impl: (req: { url: string }) => Promise<unknown>): void
}

/** Run the service worker script in a vm sandbox and return its surfaces. */
function runSw(): SwSandbox {
  const listeners: Record<string, Array<(event: unknown) => void>> = {}
  const cacheVersions = new Map<string, Map<string, unknown>>()
  const fetchCalls: string[] = []
  const sandbox: Record<string, unknown> = {
    URL,
    Promise,
    console,
    location: { origin: 'http://x' },
    self: {
      addEventListener: (type: string, fn: (event: unknown) => void): void => {
        (listeners[type] ??= []).push(fn)
      },
      skipWaiting: (): void => {},
      clients: { claim: async (): Promise<void> => {} },
    },
    caches: {
      open: async (name: string) => {
        let entries = cacheVersions.get(name)
        if (entries === undefined) { entries = new Map(); cacheVersions.set(name, entries) }
        return {
          put: async (req: { url: string }, res: unknown): Promise<void> => { entries!.set(String(req.url), res) },
          match: async (req: { url: string }): Promise<unknown> => entries!.get(String(req.url)),
        }
      },
      keys: async (): Promise<string[]> => [...cacheVersions.keys()],
      delete: async (name: string): Promise<boolean> => cacheVersions.delete(name),
      match: async (req: { url: string }): Promise<unknown> => {
        for (const entries of cacheVersions.values()) {
          const hit = entries.get(String(req.url))
          if (hit !== undefined) return hit
        }
        return undefined
      },
    },
    fetch: async (req: { url: string }): Promise<{ ok: boolean; url: string; clone: () => unknown }> => {
      fetchCalls.push(String(req.url))
      const res = { ok: true, url: String(req.url), clone: (): unknown => res }
      return res
    },
    Response: { error: (): { error: boolean } => ({ error: true }) },
  }
  runInNewContext(buildServiceWorkerScript(), sandbox)
  return {
    listeners,
    cacheVersions,
    fetchCalls,
    setFetch(impl) { sandbox.fetch = impl },
  }
}

/** Fire one fetch event and await its respondWith promise. */
async function fetchThrough(sandbox: SwSandbox, url: string, method = 'GET'): Promise<unknown> {
  let captured: Promise<unknown> | undefined
  sandbox.listeners['fetch']![0]!({
    request: { url, method },
    respondWith: (p: Promise<unknown>): void => { captured = p },
  })
  if (captured === undefined) return undefined
  return captured
}

describe('ui-mobile host half', () => {
  it('registers the /pwa/ and /sw.js routes and the index tap through the webserver', () => {
    const { ctx, taps, routes } = makeCtx()
    apply(ctx)
    expect(routes.map(r => r.path)).toEqual(['/pwa', '/sw.js', '/pwa/push/config', '/pwa/push/subscription'])
    expect(taps).toHaveLength(1)
  })

  it('injects the manifest link, iOS meta, and apple-touch-icon after <head>', () => {
    const out = indexTap()('<!doctype html>\n<html><head><meta charset="utf-8" /></head><body><div id="root"></div></body></html>')
    expect(out).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />')
    expect(out).toContain('<link rel="manifest" href="/pwa/manifest.webmanifest" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-title" content="DSH" />')
    expect(out).toContain('<link rel="apple-touch-icon" href="/pwa/icons/apple-touch-icon-180.png" />')
    expect(out.indexOf('<link rel="manifest"')).toBeLessThan(out.indexOf('</head>'))
  })

  it('fills #root with the boot skeleton (deep background + whale logo + animation)', () => {
    const out = indexTap()('<html><head></head><body><div id="root"></div></body></html>')
    expect(out).toContain('<div id="root"><div data-dsh-boot-skeleton>')
    expect(out).toContain('background:#151517')
    expect(out).toContain('dsh-boot-pulse')
    expect(out).toContain('fill="#4D6BFE"')
  })

  it('leaves documents without #root untouched', () => {
    const out = indexTap()('<html><head></head><body></body></html>')
    expect(out).not.toContain('data-dsh-boot-skeleton')
  })

  it('prepends the injection when the document has no <head>', () => {
    const out = indexTap()('<html><body><div id="root"></div></body></html>')
    expect(out.indexOf('<link rel="manifest"')).toBeLessThan(out.indexOf('<html>'))
  })

  it('strips host-declared PWA tags so the plugin ones win', () => {
    const host = '<html><head>'
      + '<meta name="viewport" content="width=device-width, initial-scale=1" />'
      + '<link rel="manifest" href="/manifest.webmanifest" />'
      + '<meta name="apple-mobile-web-app-capable" content="yes" />'
      + '<meta name="apple-mobile-web-app-status-bar-style" content="default" />'
      + '<meta name="apple-mobile-web-app-title" content="Other" />'
      + '<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />'
      + '</head><body><div id="root"></div></body></html>'
    const out = indexTap()(host)
    expect(out).not.toContain('content="width=device-width, initial-scale=1" />')
    expect(out).toContain('maximum-scale=1, user-scalable=no')
    expect(out).not.toContain('href="/manifest.webmanifest"')
    expect(out).not.toContain('content="default"')
    expect(out).not.toContain('content="Other"')
    expect(out).not.toContain('href="/icons/apple-touch-icon-180.png"')
    expect(out).toContain('href="/pwa/manifest.webmanifest"')
    expect(out).toContain('href="/pwa/icons/apple-touch-icon-180.png"')
  })

  it('serves the manifest JSON at /pwa/manifest.webmanifest', async () => {
    const res = new FakeRes()
    await handlerFor('/pwa')(fakeReq('GET', '/pwa/manifest.webmanifest'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'content-type': 'application/manifest+json; charset=utf-8' }))
    const body = JSON.parse(String(res.body))
    expect(body.display).toBe('fullscreen')
    expect(body.icons[0]!.src).toBe('/pwa/icons/icon-192.png')
    expect(body.theme_color).toBe('#4D6BFE')
  })

  it('serves a packaged icon with PNG content type and long cache', async () => {
    const res = new FakeRes()
    await handlerFor('/pwa')(fakeReq('GET', '/pwa/icons/icon-512.png'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    }))
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).length).toBeGreaterThan(1000)
  })

  it('404s unknown /pwa/ paths', async () => {
    const res = new FakeRes()
    await handlerFor('/pwa')(fakeReq('GET', '/pwa/nope'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(404)
  })

  it('rejects non-GET methods with 405', async () => {
    const res = new FakeRes()
    await handlerFor('/pwa')(fakeReq('POST', '/pwa/manifest.webmanifest'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(405)
  })

  it('serves the service worker script at /sw.js', async () => {
    const res = new FakeRes()
    await handlerFor('/sw.js')(fakeReq('GET', '/sw.js'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'content-type': 'text/javascript; charset=utf-8' }))
    expect(String(res.body)).toContain("self.addEventListener('fetch'")
    expect(String(res.body)).toContain("self.addEventListener('install'")
  })

  it('rejects non-GET methods on /sw.js with 405', async () => {
    const res = new FakeRes()
    await handlerFor('/sw.js')(fakeReq('POST', '/sw.js'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(405)
  })

  it('service worker: hashed /assets/ requests are cache-first', async () => {
    const sw = runSw()
    const first = await fetchThrough(sw, 'http://x/assets/vendor-abc.js')
    expect(first).toBeDefined() // responded from the network (nothing cached yet)
    expect(sw.fetchCalls).toEqual(['http://x/assets/vendor-abc.js'])
    const second = await fetchThrough(sw, 'http://x/assets/vendor-abc.js')
    expect(second).toBeDefined()
    expect(sw.fetchCalls).toHaveLength(1) // second hit served from cache
  })

  it('service worker: the document is network-first and falls back to cache offline', async () => {
    const sw = runSw()
    await fetchThrough(sw, 'http://x/')
    expect(sw.fetchCalls).toEqual(['http://x/']) // fresh document fetched + cached
    sw.setFetch(async () => { throw new Error('offline') })
    const offline = await fetchThrough(sw, 'http://x/')
    expect(offline).toBeDefined() // fell back to the cached copy
    expect(sw.fetchCalls).toHaveLength(1) // no second network attempt surfaced
  })

  it('service worker: other same-origin GETs are cache-first with lazy fill', async () => {
    const sw = runSw()
    await fetchThrough(sw, 'http://x/pwa/icons/icon-192.png')
    expect(sw.fetchCalls).toEqual(['http://x/pwa/icons/icon-192.png'])
    await fetchThrough(sw, 'http://x/pwa/icons/icon-192.png')
    expect(sw.fetchCalls).toHaveLength(1)
  })

  it('service worker: ignores non-GET and cross-origin requests', async () => {
    const sw = runSw()
    expect(await fetchThrough(sw, 'http://x/anything', 'POST')).toBeUndefined()
    expect(await fetchThrough(sw, 'https://other.example/x')).toBeUndefined()
    expect(sw.fetchCalls).toHaveLength(0)
  })

  it('service worker: install/activate skip waiting and purge stale cache versions', async () => {
    const sw = runSw()
    const installWait: Promise<unknown>[] = []
    sw.listeners['install']![0]!({ waitUntil: (p: Promise<unknown>): void => { installWait.push(p) } })
    await Promise.all(installWait) // install resolves (skipWaiting) without throwing
    // A previous app-shell version leaves a stale cache name behind.
    sw.cacheVersions.set('dsh-ui-mobile-shell-v0', new Map())
    sw.cacheVersions.set('dsh-ui-mobile-shell-v1', new Map())
    let activation: Promise<unknown> | undefined
    sw.listeners['activate']![0]!({ waitUntil: (p: Promise<unknown>): void => { activation = p } })
    await activation
    expect(sw.cacheVersions.has('dsh-ui-mobile-shell-v0')).toBe(false) // purged
    expect(sw.cacheVersions.has('dsh-ui-mobile-shell-v1')).toBe(true) // current kept
  })
})
