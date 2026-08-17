/**
 * Host loader entry for the mobile plugin: the PWA host half.
 *
 * The browser half is only the promotion UI; this half makes the page actually
 * installable without touching the shell. It taps the served index.html to
 * inject the manifest link and the iOS PWA meta tags, and registers the
 * `/pwa/` route that serves the manifest JSON and the packaged icons. The
 * injection happens server-side before the browser parses the document, so it
 * is equivalent to shipping those tags statically — no shell change needed.
 * Host-provided PWA declarations are stripped first so the plugin's own win.
 */
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Manifest served at /pwa/manifest.webmanifest (icons resolve to /pwa/icons/). */
const MANIFEST = {
  id: '/',
  name: 'DeepSeek Harness',
  short_name: 'DSH',
  description: 'DeepSeek Harness — the agentic coding harness with a Web GUI',
  start_url: '/',
  scope: '/',
  display: 'fullscreen',
  theme_color: '#4D6BFE',
  background_color: '#151517',
  icons: [
    { src: '/pwa/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
} as const

/** Packaged icons, by filename, as served under /pwa/icons/. */
const ICONS: Record<string, string> = {
  'icon-192.png': fileURLToPath(new URL('../assets/icons/icon-192.png', import.meta.url)),
  'icon-512.png': fileURLToPath(new URL('../assets/icons/icon-512.png', import.meta.url)),
  'apple-touch-icon-180.png': fileURLToPath(new URL('../assets/icons/apple-touch-icon-180.png', import.meta.url)),
}

/** The head fragment injected into every served index.html. */
const HEAD_INJECTION = [
  '<link rel="manifest" href="/pwa/manifest.webmanifest" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="DSH" />',
  '<link rel="apple-touch-icon" href="/pwa/icons/apple-touch-icon-180.png" />',
].join('\n    ')

/** Drop host-declared PWA tags so the plugin's injected ones win. */
function stripHostPwa(html: string): string {
  return html
    .replace(/<link\b[^>]*\brel="manifest"[^>]*>/gi, '')
    .replace(/<meta\b[^>]*\bname="(?:mobile-web-app-capable|apple-mobile-web-app-capable|apple-mobile-web-app-status-bar-style|apple-mobile-web-app-title)"[^>]*>/gi, '')
    .replace(/<link\b[^>]*\brel="apple-touch-icon"[^>]*>/gi, '')
}

/** Inject the PWA head fragment right after <head> (or prepend without one). */
function injectPwaHead(html: string): string {
  const head = html.indexOf('<head>')
  const injection = `\n    ${HEAD_INJECTION}`
  if (head === -1) return `${injection}\n${html}`
  return `${html.slice(0, head + 6)}${injection}${html.slice(head + 6)}`
}

/** Serve one /pwa/ asset: the manifest JSON or a packaged icon. */
async function servePwa(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  /* v8 ignore next -- `?? '/'` arm: node:http always sets url on server requests. */
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  if (pathname === '/pwa/manifest.webmanifest') {
    const body = JSON.stringify(MANIFEST)
    res.writeHead(200, {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'no-cache',
    })
    res.end(body)
    return
  }
  const match = /^\/pwa\/icons\/([^/]+)$/.exec(pathname)
  const name = match?.[1]
  const iconPath = name === undefined ? undefined : ICONS[name]
  if (iconPath === undefined) {
    res.writeHead(404)
    res.end()
    return
  }
  try {
    res.writeHead(200, {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    })
    res.end(readFileSync(iconPath))
  } catch {
    /* v8 ignore start -- icon files ship inside the package (files: assets);
     * unreadable only on a corrupted install, not reachable in tests. */
    res.writeHead(404)
    res.end()
    /* v8 ignore stop */
  }
}

/**
 * Register the PWA host surface when the webserver service is composed.
 * @param ctx - Host context that may acquire the webserver service.
 */
export function apply(ctx: Context): void {
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.register({ kind: 'prefix', path: '/pwa', handler: servePwa }),
      'dsh-ui-mobile: pwa asset route',
    )
    httpCtx.effect(
      () => httpCtx.webServer.tapIndex(html => injectPwaHead(stripHostPwa(html))),
      'dsh-ui-mobile: pwa head injection',
    )
  })
}
