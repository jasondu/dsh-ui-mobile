// @vitest-environment jsdom
/**
 * ui-mobile browser half: the apply() wiring — the frame + install controller
 * effect lifecycle and the three registrations' inject faces (header menu
 * toggle over ctx.layout, drawer scrim, and the install banner).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { HeaderMenuButton, type HeaderMenuButtonInjected } from '../src/client/HeaderMenuButton.tsx'
import { NewSessionMenuButton, type NewSessionMenuButtonInjected } from '../src/client/NewSessionMenuButton.tsx'
import { ConversationNavigator, type ConversationNavigatorInjected } from '../src/client/ConversationNavigator.tsx'
import { BackToBottom } from '../src/client/BackToBottom.tsx'
import { DrawerScrim, type DrawerScrimInjected } from '../src/client/DrawerScrim.tsx'
import { InstallBanner, type InstallBannerInjected } from '../src/client/InstallBanner.tsx'
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
  injectFactory: () => unknown
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
        registrations.push({ component, injectFactory: options.inject as () => unknown })
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

  it('registers menu buttons for sessions and new sessions, plus shell controls', () => {
    const frame = mountFrame()
    const { ctx, registrations } = makeCtx()
    apply(ctx)
    expect(registrations.map(r => r.component)).toEqual([HeaderMenuButton, DrawerScrim, NewSessionMenuButton, ConversationNavigator, BackToBottom, InstallBanner])
    expect(frame.hasAttribute('data-mobile-frame')).toBe(true)
  })

  it('binds the header menu toggle to ctx.layout.toggleSidebar', () => {
    mountFrame()
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<HeaderMenuButtonInjected>(HeaderMenuButton)!
    face.toggleSidebar()
    expect(layout.toggleSidebar).toHaveBeenCalledTimes(1)
    const unsubscribe = face.subscribe(() => {})
    unsubscribe()
    // jsdom has no matchMedia and the fixture is fully collapsed.
    expect(face.snapshot()).toEqual({ mobile: false, sidebarOpen: false, detailsOpen: false })
  })

  it('binds the new-session menu toggle to ctx.layout.toggleSidebar', () => {
    mountFrame()
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<NewSessionMenuButtonInjected>(NewSessionMenuButton)!
    face.toggleSidebar()
    expect(layout.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('binds the conversation navigator to the shared mobile frame', () => {
    mountFrame()
    const { ctx, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<ConversationNavigatorInjected>(ConversationNavigator)!
    expect(face.frame.snapshot().mobile).toBe(false)
    expect(face.navigator.snapshot().waypoints).toEqual([])
  })

  it('binds the drawer scrim to the same sidebar toggle and snapshot', () => {
    mountFrame({ sidebarCollapsed: false }) // sidebar open
    const { ctx, layout, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<DrawerScrimInjected>(DrawerScrim)!
    expect(face.snapshot().sidebarOpen).toBe(true)
    face.toggleSidebar()
    expect(layout.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('binds the install inject face to the install controller', async () => {
    mountFrame()
    const { ctx, byComponent } = makeCtx()
    apply(ctx)
    const face = byComponent<InstallBannerInjected>(InstallBanner)!
    // jsdom: no matchMedia, no iOS UA, no prompt — the banner is inert.
    expect(face.snapshot()).toEqual({ mobile: false, installable: false, iosHintVisible: false })
    await face.install() // no-op without a pending prompt
    face.dismissInstallPromotion() // persists the dismissal even when already hidden
    const unsubscribe = face.subscribe(() => {})
    unsubscribe()
  })

  it('stops both controllers, the keyboard guard, and both slot contributions on teardown', () => {
    mountFrame()
    const { ctx, disposers, slotDisposers } = makeCtx()
    apply(ctx)
    // Controllers, command-panel keyboard guard, and keyboard send action.
    expect(disposers).toHaveLength(3)
    for (const disposer of disposers) expect(() => disposer()).not.toThrow()
    // One slots.inject contribution per surface: header.left and shell.overlay.
    expect(slotDisposers).toHaveLength(2)
    for (const disposer of slotDisposers) expect(() => disposer()).not.toThrow()
  })
})
