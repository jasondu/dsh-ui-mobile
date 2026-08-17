// @vitest-environment jsdom
/**
 * ui-mobile browser half: the InstallBanner contract — phone-only rendering,
 * the install CTA and the iOS hint states, and live state mirroring.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallBanner, type InstallBannerInjected, type InstallBannerProps } from '../src/client/InstallBanner.tsx'
import type { InstallState } from '../src/client/install.ts'

const defaultState: InstallState = { mobile: true, installable: false, iosHintVisible: false }

function makeProps(overrides: Partial<InstallBannerProps> = {}): InstallBannerProps {
  return {
    snapshot: () => defaultState,
    subscribe: () => () => {},
    install: vi.fn(async () => {}),
    dismissIosHint: vi.fn(),
    useSessions: ((selector: (s: { current?: string }) => unknown) =>
      selector({ current: 's1' })) as unknown as InstallBannerProps['useSessions'],
    useWorkspaces: ((selector: (s: unknown) => unknown) =>
      selector({ items: [] })) as unknown as InstallBannerProps['useWorkspaces'],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('InstallBanner', () => {
  it('renders nothing on desktop', () => {
    render(<InstallBanner {...makeProps({ snapshot: () => ({ ...defaultState, mobile: false, installable: true }) })} />)
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('renders nothing when no state is pending', () => {
    render(<InstallBanner {...makeProps()} />)
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('renders the install CTA while installable and calls install()', () => {
    const install = vi.fn(async () => {})
    render(<InstallBanner {...makeProps({ install, snapshot: () => ({ ...defaultState, installable: true }) })} />)
    const region = screen.getByRole('region', { name: '安装应用' })
    expect(region).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '安装' }))
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('renders the iOS hint and dismisses it', () => {
    const dismissIosHint = vi.fn()
    render(<InstallBanner {...makeProps({ dismissIosHint, snapshot: () => ({ ...defaultState, iosHintVisible: true }) })} />)
    expect(screen.getByRole('region', { name: '添加到主屏幕' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }))
    expect(dismissIosHint).toHaveBeenCalledTimes(1)
  })

  it('prefers the install CTA when both states are pending', () => {
    render(<InstallBanner {...makeProps({ snapshot: () => ({ ...defaultState, installable: true, iosHintVisible: true }) })} />)
    expect(screen.getByRole('region', { name: '安装应用' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: '添加到主屏幕' })).toBeNull()
  })

  it('mirrors controller state changes while mounted', () => {
    const listeners = new Set<() => void>()
    const state: InstallState = { ...defaultState }
    const props = makeProps({
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      snapshot: () => ({ ...state }),
    })
    render(<InstallBanner {...props} />)
    expect(screen.queryByRole('region')).toBeNull()
    state.installable = true
    act(() => { for (const listener of listeners) listener() })
    expect(screen.getByRole('region', { name: '安装应用' })).toBeTruthy()
  })

  it('exposes the inject face shape consumed by the registration', () => {
    const face: InstallBannerInjected = {
      snapshot: () => defaultState,
      subscribe: () => () => {},
      install: vi.fn(async () => {}),
      dismissIosHint: vi.fn(),
    }
    expect(face.snapshot()).toEqual(defaultState)
    expect(typeof face.subscribe).toBe('function')
    expect(typeof face.install).toBe('function')
    expect(typeof face.dismissIosHint).toBe('function')
  })
})
