// @vitest-environment jsdom
/**
 * ui-mobile browser half: the apply() wiring — the frame + install controller
 * effect lifecycle and the two shell.overlay registrations' inject faces over
 * ctx.layout and the install controller.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { InstallBanner, type InstallBannerInjected } from '../src/client/InstallBanner.tsx'
import { MobileNav, type MobileNavInjected } from '../src/client/MobileNav.tsx'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** Build an AppFrame-shaped fixture; returns the frame element. */
function mountFrame(attributes: { sidebarCollapsed?: boolean; detailsCollapsed?: boolean } = {}): HTMLElement {
  const frame = document.createElement('div')
  if (attributes.sidebarCollapsed !== false) frame.setAttribute('data-sidebar-collapsed', '')
  if (attributes.detailsCollapsed !== false) frame.setAttribute('data-details-collapsed', '')
  const overlay = document.createElement('div')
  overlay.setAttribute('data-shell-overlay', '')
  frame.append(document.createElement('div'), document.createElement('div'), document.createElement('div'), overlay)
  document.body.append(frame)
  return frame
}

interface Registered {
  component: unknown
  injectFactory: (() => MobileNavInjected) | (() => InstallBannerInjected)
}

/** Minimal client ctx: synchronous effect, eager slots injection, stubbed layout. */
function makeCtx() {
  const layout = { toggleSidebar: vi.fn(), openDetails: vi.fn(), closeDetails: vi.fn() }
  const disposers: Array<() => void> = []
  const slotDisposers: Array<() => void> = []
  const registrations: Registered[] = []
  const ctx = {
    layout,
    effect(run: () => (() => void) | undefined): void {
      const disposer = run()
      if (disposer !== undefined) disposers.push(disposer)
    },
    slots: {
      inject(_name: string, register: () => void): void {
        const disposer = register()
        if (typeof disposer === 'function') slotDisposers.push(disposer)
      },
      register(options: { inject?: () => unknown }, component: unknown): () => void {
        registrations.push({ component, injectFactory: options.inject as () => MobileNavInjected })
        return () => {}
      },
    },
  } as unknown as ClientContext
  const byComponent = <T,>(component: unknown): T | undefined => {
    const factory = registrations.find(r => r.component === component)?.injectFactory as (() => T) | undefined
    return factory?.()
  }
  return { ctx, layout, disposers, slotDisposers, registrations, byComponent }
}

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ui-mobile apply', () => {
  it('declares the layout and slots service dependencies', () => {
    expect(inject).toEqual(['layout', 'slots'])
  })

  it('registers the MobileNav and the InstallBanner into the shell overlay', () => {
    const frame = mountFrame()
    const { ctx, registrations } = makeCtx()
    apply(ctx)
    expect(registrations.map(r => r.component)).toEqual([MobileNav, InstallBanner])
    expect(frame.hasAttribute('data-mobile-frame')).toBe(true)
  })

  it('binds the nav inject face to ctx.layout panel actions', () => {
    mountFrame()
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<MobileNavInjected>(MobileNav)!
    face.toggleSidebar()
    expect(layout.toggleSidebar).toHaveBeenCalledTimes(1)
    const unsubscribe = face.subscribe(() => {})
    unsubscribe()
    // jsdom has no matchMedia and the fixture is fully collapsed.
    expect(face.snapshot()).toEqual({ mobile: false, sidebarOpen: false, detailsOpen: false })
  })

  it('opens the details drawer when it is closed', () => {
    mountFrame({ detailsCollapsed: true }) // closed
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<MobileNavInjected>(MobileNav)!
    expect(face.snapshot().detailsOpen).toBe(false)
    face.toggleDetails()
    expect(layout.openDetails).toHaveBeenCalledTimes(1)
    expect(layout.closeDetails).not.toHaveBeenCalled()
  })

  it('closes the details drawer when it is open', () => {
    mountFrame({ detailsCollapsed: false }) // open
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<MobileNavInjected>(MobileNav)!
    expect(face.snapshot().detailsOpen).toBe(true)
    face.toggleDetails()
    expect(layout.closeDetails).toHaveBeenCalledTimes(1)
    expect(layout.openDetails).not.toHaveBeenCalled()
  })

  it('binds the install inject face to the install controller', async () => {
    mountFrame()
    const { ctx, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<InstallBannerInjected>(InstallBanner)!
    // jsdom: no matchMedia, no iOS UA, no prompt — the banner is inert.
    expect(face.snapshot()).toEqual({ mobile: false, installable: false, iosHintVisible: false })
    await face.install() // no-op without a pending prompt
    face.dismissIosHint() // persists the dismissal even when already hidden
    const unsubscribe = face.subscribe(() => {})
    unsubscribe()
  })

  it('stops both controllers on effect teardown', () => {
    mountFrame()
    const { ctx, disposers, slotDisposers } = makeCtx()
    apply(ctx)
    expect(disposers).toHaveLength(1)
    expect(() => disposers[0]!()).not.toThrow()
    // The slots.inject contribution returns a combined disposer that removes
    // both registrations (HMR teardown path).
    expect(slotDisposers).toHaveLength(1)
    expect(() => slotDisposers[0]!()).not.toThrow()
  })
})
