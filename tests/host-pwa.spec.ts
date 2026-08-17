/**
 * ui-mobile host half: the PWA surface — index.html tap (manifest link, iOS
 * meta, stripping host tags) and the /pwa/ route (manifest JSON, packaged
 * icons, 404/405 handling).
 */
import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { apply } from '../src/index.ts'
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

/** Build the ctx and return the captured route handler. */
function pwaHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void> | void {
  const { ctx, routes } = makeCtx()
  apply(ctx)
  return routes[0]!.handler
}

describe('ui-mobile host half', () => {
  it('registers the /pwa/ route and the index tap through the webserver', () => {
    const { ctx, taps, routes } = makeCtx()
    apply(ctx)
    expect(routes).toHaveLength(1)
    expect(routes[0]!.path).toBe('/pwa')
    expect(taps).toHaveLength(1)
  })

  it('injects the manifest link, iOS meta, and apple-touch-icon after <head>', () => {
    const { ctx, taps } = makeCtx()
    apply(ctx)
    const out = taps[0]!('<!doctype html>\n<html><head><meta charset="utf-8" /></head><body></body></html>')
    expect(out).toContain('<link rel="manifest" href="/pwa/manifest.webmanifest" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />')
    expect(out).toContain('<meta name="apple-mobile-web-app-title" content="DSH" />')
    expect(out).toContain('<link rel="apple-touch-icon" href="/pwa/icons/apple-touch-icon-180.png" />')
    // Injection lands inside <head>, before the closing head.
    expect(out.indexOf('<link rel="manifest"')).toBeLessThan(out.indexOf('</head>'))
  })

  it('prepends the injection when the document has no <head>', () => {
    const { ctx, taps } = makeCtx()
    apply(ctx)
    const out = taps[0]!('<html><body></body></html>')
    expect(out.indexOf('<link rel="manifest"')).toBeLessThan(out.indexOf('<html>'))
  })

  it('strips host-declared PWA tags so the plugin ones win', () => {
    const { ctx, taps } = makeCtx()
    apply(ctx)
    const host = '<html><head>'
      + '<link rel="manifest" href="/manifest.webmanifest" />'
      + '<meta name="apple-mobile-web-app-capable" content="yes" />'
      + '<meta name="apple-mobile-web-app-status-bar-style" content="default" />'
      + '<meta name="apple-mobile-web-app-title" content="Other" />'
      + '<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />'
      + '</head><body></body></html>'
    const out = taps[0]!(host)
    expect(out).not.toContain('href="/manifest.webmanifest"')
    expect(out).not.toContain('content="default"')
    expect(out).not.toContain('content="Other"')
    expect(out).not.toContain('href="/icons/apple-touch-icon-180.png"')
    expect(out).toContain('href="/pwa/manifest.webmanifest"')
    expect(out).toContain('href="/pwa/icons/apple-touch-icon-180.png"')
  })

  it('serves the manifest JSON at /pwa/manifest.webmanifest', async () => {
    const res = new FakeRes()
    await pwaHandler()(fakeReq('GET', '/pwa/manifest.webmanifest'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'content-type': 'application/manifest+json; charset=utf-8' }))
    const body = JSON.parse(String(res.body))
    expect(body.display).toBe('fullscreen')
    expect(body.icons[0]!.src).toBe('/pwa/icons/icon-192.png')
    expect(body.theme_color).toBe('#4D6BFE')
  })

  it('serves a packaged icon with PNG content type and long cache', async () => {
    const res = new FakeRes()
    await pwaHandler()(fakeReq('GET', '/pwa/icons/icon-512.png'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    }))
    expect(Buffer.isBuffer(res.body)).toBe(true)
    expect((res.body as Buffer).length).toBeGreaterThan(1000)
  })

  it('404s unknown /pwa/ paths', async () => {
    const res = new FakeRes()
    await pwaHandler()(fakeReq('GET', '/pwa/nope'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(404)
  })

  it('rejects non-GET methods with 405', async () => {
    const res = new FakeRes()
    await pwaHandler()(fakeReq('POST', '/pwa/manifest.webmanifest'), res as unknown as ServerResponse)
    expect(res.writeHead).toHaveBeenCalledWith(405)
  })
})
