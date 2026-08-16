// @vitest-environment jsdom
/**
 * ui-mobile browser half: the apply() wiring — the frame controller effect
 * lifecycle and the shell.overlay registration's inject face over ctx.layout.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
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

/** Minimal client ctx: synchronous effect, eager slots injection, stubbed layout. */
function makeCtx() {
  const layout = { toggleSidebar: vi.fn(), openDetails: vi.fn(), closeDetails: vi.fn() }
  const disposers: Array<() => void> = []
  let registration: { component: unknown; injectFactory: () => MobileNavInjected } | undefined
  const ctx = {
    layout,
    effect(run: () => (() => void) | undefined): void {
      const disposer = run()
      if (disposer !== undefined) disposers.push(disposer)
    },
    slots: {
      inject(_name: string, register: () => void): void { register() },
      register(options: { inject?: () => MobileNavInjected }, component: unknown): () => void {
        registration = { component, injectFactory: options.inject as () => MobileNavInjected }
        return () => {}
      },
    },
  } as unknown as ClientContext
  return { ctx, layout, disposers, registration: () => registration }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('ui-mobile apply', () => {
  it('declares the layout and slots service dependencies', () => {
    expect(inject).toEqual(['layout', 'slots'])
  })

  it('registers the MobileNav into the shell overlay with a bound inject face', () => {
    const frame = mountFrame()
    const { ctx, layout, registration } = makeCtx()
    apply(ctx)
    expect(registration()).toBeDefined()
    expect(registration()!.component).toBe(MobileNav)
    const face = registration()!.injectFactory()
    face.toggleSidebar()
    expect(layout.toggleSidebar).toHaveBeenCalledTimes(1)
    const unsubscribe = face.subscribe(() => {})
    unsubscribe()
    // jsdom has no matchMedia and the fixture is fully collapsed.
    expect(face.snapshot()).toEqual({ mobile: false, sidebarOpen: false, detailsOpen: false })
    expect(frame.hasAttribute('data-mobile-frame')).toBe(true)
  })

  it('opens the details drawer when it is closed', () => {
    mountFrame({ detailsCollapsed: true }) // closed
    const { ctx, layout, registration } = makeCtx()
    apply(ctx)
    const face = registration()!.injectFactory()
    expect(face.snapshot().detailsOpen).toBe(false)
    face.toggleDetails()
    expect(layout.openDetails).toHaveBeenCalledTimes(1)
    expect(layout.closeDetails).not.toHaveBeenCalled()
  })

  it('closes the details drawer when it is open', () => {
    mountFrame({ detailsCollapsed: false }) // open
    const { ctx, layout, registration } = makeCtx()
    apply(ctx)
    const face = registration()!.injectFactory()
    expect(face.snapshot().detailsOpen).toBe(true)
    face.toggleDetails()
    expect(layout.closeDetails).toHaveBeenCalledTimes(1)
    expect(layout.openDetails).not.toHaveBeenCalled()
  })

  it('stops the frame controller on effect teardown', () => {
    mountFrame()
    const { ctx, disposers } = makeCtx()
    apply(ctx)
    expect(disposers).toHaveLength(1)
    expect(() => disposers[0]!()).not.toThrow()
  })
})
