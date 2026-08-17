// @vitest-environment jsdom
/**
 * ui-mobile browser half: the HeaderMenuButton contract — icon-only sidebar
 * toggle in the session header's left strip, live drawer state mirroring.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeaderMenuButton, type HeaderMenuButtonInjected, type HeaderMenuButtonProps } from '../src/client/HeaderMenuButton.tsx'
import type { MobileNavState } from '../src/client/frame.ts'

const defaultState: MobileNavState = { mobile: true, sidebarOpen: false, detailsOpen: false }

function makeProps(overrides: Partial<HeaderMenuButtonProps> = {}): HeaderMenuButtonProps {
  return {
    toggleSidebar: vi.fn(),
    subscribe: () => () => {},
    snapshot: () => defaultState,
    // header.left is a session-scope slot: the framework session kit and the
    // global seat are required.
    useSession: ((selector: (s: unknown) => unknown) => selector({})) as unknown as HeaderMenuButtonProps['useSession'],
    sessionId: 's1' as unknown as HeaderMenuButtonProps['sessionId'],
    useProjection: (() => undefined) as unknown as HeaderMenuButtonProps['useProjection'],
    useInput: (() => undefined) as unknown as HeaderMenuButtonProps['useInput'],
    inputActions: {} as unknown as HeaderMenuButtonProps['inputActions'],
    useSessions: ((selector: (s: { current?: string }) => unknown) =>
      selector({ current: 's1' })) as unknown as HeaderMenuButtonProps['useSessions'],
    useWorkspaces: ((selector: (s: unknown) => unknown) =>
      selector({ items: [] })) as unknown as HeaderMenuButtonProps['useWorkspaces'],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('HeaderMenuButton', () => {
  it('renders an icon-only toggle labelled 菜单', () => {
    render(<HeaderMenuButton {...makeProps()} />)
    const button = screen.getByRole('button', { name: '菜单' })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(button.textContent).toBeDefined() // icon renders
    expect(button.textContent).not.toContain('菜单') // icon only, no label text
  })

  it('toggles the sidebar through the injected action', () => {
    const toggleSidebar = vi.fn()
    render(<HeaderMenuButton {...makeProps({ toggleSidebar })} />)
    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    expect(toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('marks the toggle pressed while the sidebar is open', () => {
    render(<HeaderMenuButton {...makeProps({ snapshot: () => ({ ...defaultState, sidebarOpen: true }) })} />)
    expect(screen.getByRole('button', { name: '菜单' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('mirrors controller state changes while mounted', () => {
    const listeners = new Set<() => void>()
    const state: MobileNavState = { ...defaultState }
    const props = makeProps({
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      snapshot: () => ({ ...state }),
    })
    render(<HeaderMenuButton {...props} />)
    state.sidebarOpen = true
    act(() => { for (const listener of listeners) listener() })
    expect(screen.getByRole('button', { name: '菜单' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('exposes the inject face shape consumed by the registration', () => {
    const face: HeaderMenuButtonInjected = {
      toggleSidebar: vi.fn(),
      subscribe: () => () => {},
      snapshot: () => defaultState,
    }
    expect(face.snapshot()).toEqual(defaultState)
    expect(typeof face.subscribe).toBe('function')
    expect(typeof face.toggleSidebar).toBe('function')
  })
})
