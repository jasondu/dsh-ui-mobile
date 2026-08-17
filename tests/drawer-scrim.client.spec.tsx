// @vitest-environment jsdom
/**
 * ui-mobile browser half: the DrawerScrim contract — phone-only tap-outside
 * layer for the open sidebar drawer, live drawer state mirroring.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrawerScrim, type DrawerScrimInjected, type DrawerScrimProps } from '../src/client/DrawerScrim.tsx'
import type { MobileNavState } from '../src/client/frame.ts'

const defaultState: MobileNavState = { mobile: true, sidebarOpen: false, detailsOpen: false }

function makeProps(overrides: Partial<DrawerScrimProps> = {}): DrawerScrimProps {
  return {
    toggleSidebar: vi.fn(),
    subscribe: () => () => {},
    snapshot: () => defaultState,
    useSessions: ((selector: (s: { current?: string }) => unknown) =>
      selector({ current: 's1' })) as unknown as DrawerScrimProps['useSessions'],
    useWorkspaces: ((selector: (s: unknown) => unknown) =>
      selector({ items: [] })) as unknown as DrawerScrimProps['useWorkspaces'],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('DrawerScrim', () => {
  it('renders nothing while the sidebar is closed', () => {
    render(<DrawerScrim {...makeProps()} />)
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
  })

  it('renders the scrim while the sidebar is open and closes it on tap', () => {
    const toggleSidebar = vi.fn()
    render(<DrawerScrim {...makeProps({ toggleSidebar, snapshot: () => ({ ...defaultState, sidebarOpen: true }) })} />)
    fireEvent.click(screen.getByLabelText('关闭面板'))
    expect(toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('never renders on desktop even with the sidebar open', () => {
    render(<DrawerScrim {...makeProps({ snapshot: () => ({ ...defaultState, mobile: false, sidebarOpen: true }) })} />)
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
  })

  it('mirrors controller state changes while mounted', () => {
    const listeners = new Set<() => void>()
    const state: MobileNavState = { ...defaultState }
    const props = makeProps({
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      snapshot: () => ({ ...state }),
    })
    render(<DrawerScrim {...props} />)
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
    state.sidebarOpen = true
    act(() => { for (const listener of listeners) listener() })
    expect(screen.getByLabelText('关闭面板')).toBeTruthy()
  })

  it('exposes the inject face shape consumed by the registration', () => {
    const face: DrawerScrimInjected = {
      toggleSidebar: vi.fn(),
      subscribe: () => () => {},
      snapshot: () => defaultState,
    }
    expect(face.snapshot()).toEqual(defaultState)
    expect(typeof face.subscribe).toBe('function')
    expect(typeof face.toggleSidebar).toBe('function')
  })
})
