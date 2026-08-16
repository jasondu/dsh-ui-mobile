// @vitest-environment jsdom
/**
 * ui-mobile browser half: the MobileNav bar contract — phone-tier rendering,
 * session-gated details button, drawer scrim, and live state mirroring.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileNav, type MobileNavInjected, type MobileNavProps } from '../src/client/MobileNav.tsx'
import type { MobileNavState } from '../src/client/frame.ts'
import css from '../src/client/MobileNav.module.css'

const withSession = ((): MobileNavProps['useSessions'] => {
  return ((selector: (s: { current?: string; byId: Record<string, unknown> }) => unknown) =>
    selector({ current: 's1', byId: {} })) as unknown as MobileNavProps['useSessions']
})()

const withoutSession = ((): MobileNavProps['useSessions'] => {
  return ((selector: (s: { current?: string; byId: Record<string, unknown> }) => unknown) =>
    selector({ byId: {} })) as unknown as MobileNavProps['useSessions']
})()

const useWorkspaces = ((selector: (s: unknown) => unknown) =>
  selector({ items: [] })) as unknown as MobileNavProps['useWorkspaces']

const defaultState: MobileNavState = { mobile: true, sidebarOpen: false, detailsOpen: false }

function makeProps(overrides: Partial<MobileNavProps> = {}): MobileNavProps {
  return {
    toggleSidebar: vi.fn(),
    toggleDetails: vi.fn(),
    subscribe: () => () => {},
    snapshot: () => defaultState,
    useSessions: withSession,
    useWorkspaces,
    ...overrides,
  }
}

const pressed = (button: HTMLElement): string | null => button.getAttribute('aria-pressed')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MobileNav', () => {
  it('renders the sidebar toggle on mobile', () => {
    render(<MobileNav {...makeProps()} />)
    const menu = screen.getByRole('button', { name: '菜单' })
    expect(pressed(menu)).toBe('false')
    expect(screen.getByRole('navigation', { name: '移动端导航' }).classList.contains(css.desktopHidden!)).toBe(false)
  })

  it('hides the details toggle when no session is current', () => {
    render(<MobileNav {...makeProps({ useSessions: withoutSession })} />)
    expect(screen.getByRole('button', { name: '菜单' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '详情' })).toBeNull()
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
  })

  it('renders the details toggle when a session is current', () => {
    render(<MobileNav {...makeProps()} />)
    const details = screen.getByRole('button', { name: '详情' })
    expect(pressed(details)).toBe('false')
  })

  it('marks the sidebar toggle pressed when the drawer is open', () => {
    render(<MobileNav {...makeProps({ snapshot: () => ({ ...defaultState, sidebarOpen: true }) })} />)
    expect(pressed(screen.getByRole('button', { name: '菜单' }))).toBe('true')
  })

  it('marks the details toggle pressed when the drawer is open', () => {
    render(<MobileNav {...makeProps({ snapshot: () => ({ ...defaultState, detailsOpen: true }) })} />)
    expect(pressed(screen.getByRole('button', { name: '详情' }))).toBe('true')
  })

  it('hides the bar and never shows the scrim on desktop', () => {
    render(<MobileNav {...makeProps({ snapshot: () => ({ ...defaultState, mobile: false, sidebarOpen: true, detailsOpen: true }) })} />)
    expect(screen.getByRole('navigation', { name: '移动端导航' }).classList.contains(css.desktopHidden!)).toBe(true)
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
  })

  it('toggles the sidebar through the injected action', () => {
    const toggleSidebar = vi.fn()
    render(<MobileNav {...makeProps({ toggleSidebar })} />)
    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    expect(toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('toggles the details through the injected action', () => {
    const toggleDetails = vi.fn()
    render(<MobileNav {...makeProps({ toggleDetails })} />)
    fireEvent.click(screen.getByRole('button', { name: '详情' }))
    expect(toggleDetails).toHaveBeenCalledTimes(1)
  })

  it('closes the sidebar drawer through the scrim', () => {
    const toggleSidebar = vi.fn()
    render(<MobileNav {...makeProps({ toggleSidebar, snapshot: () => ({ ...defaultState, sidebarOpen: true }) })} />)
    const scrim = screen.getByLabelText('关闭面板')
    fireEvent.click(scrim)
    expect(toggleSidebar).toHaveBeenCalledTimes(1)
    expect(pressed(screen.getByRole('button', { name: '菜单' }))).toBe('true')
  })

  it('closes the details drawer through the scrim', () => {
    const toggleDetails = vi.fn()
    render(<MobileNav {...makeProps({ toggleDetails, snapshot: () => ({ ...defaultState, detailsOpen: true }) })} />)
    fireEvent.click(screen.getByLabelText('关闭面板'))
    expect(toggleDetails).toHaveBeenCalledTimes(1)
  })

  it('mirrors controller state changes while mounted', () => {
    const listeners = new Set<() => void>()
    const state: MobileNavState = { ...defaultState }
    const props = makeProps({
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      // Fresh object reference per read: React bails out when setState receives
      // the same reference, mirroring the controller's publish contract.
      snapshot: () => ({ ...state }),
    })
    render(<MobileNav {...props} />)
    expect(pressed(screen.getByRole('button', { name: '菜单' }))).toBe('false')
    state.sidebarOpen = true
    act(() => { for (const listener of listeners) listener() })
    expect(pressed(screen.getByRole('button', { name: '菜单' }))).toBe('true')
    expect(screen.getByLabelText('关闭面板')).toBeTruthy()
  })

  it('exposes the inject face shape consumed by the registration', () => {
    const face: MobileNavInjected = {
      toggleSidebar: vi.fn(),
      toggleDetails: vi.fn(),
      subscribe: () => () => {},
      snapshot: () => defaultState,
    }
    expect(face.snapshot()).toEqual(defaultState)
    expect(typeof face.subscribe).toBe('function')
    expect(typeof face.toggleSidebar).toBe('function')
    expect(typeof face.toggleDetails).toBe('function')
  })
})
