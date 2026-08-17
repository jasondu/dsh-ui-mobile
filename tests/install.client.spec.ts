// @vitest-environment jsdom
/**
 * ui-mobile browser half: the InstallController contract — beforeinstallprompt
 * lifecycle, iOS hint gating (standalone detection, localStorage dismissal),
 * phone-tier mirroring, and the subscribe/snapshot pair.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallController, type InstallState } from '../src/client/install.ts'

class MediaStub {
  matches = false
  private readonly listeners = new Set<() => void>()

  addEventListener(_type: 'change', listener: () => void): void { this.listeners.add(listener) }

  removeEventListener(_type: 'change', listener: () => void): void { this.listeners.delete(listener) }

  fire(matches: boolean): void {
    this.matches = matches
    for (const listener of this.listeners) listener()
  }
}

const defaultState: InstallState = { mobile: false, installable: false, iosHintVisible: false }

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('InstallController', () => {
  it('starts at desktop state without matchMedia and without a prompt', () => {
    const controller = new InstallController()
    controller.start()
    expect(controller.snapshot()).toEqual(defaultState)
    controller.stop()
  })

  it('reflects the phone tier from the media list and notifies on change', () => {
    const media = new MediaStub()
    media.matches = true
    const controller = new InstallController(media)
    controller.start()
    expect(controller.snapshot().mobile).toBe(true)
    const listener = vi.fn()
    controller.subscribe(listener)
    media.fire(false)
    expect(controller.snapshot().mobile).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    media.fire(false) // unchanged → no notification
    expect(listener).toHaveBeenCalledTimes(1)
    controller.stop()
  })

  it('tracks the beforeinstallprompt event and exposes install()', async () => {
    const media = new MediaStub()
    media.matches = true
    const controller = new InstallController(media)
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    expect(controller.snapshot().installable).toBe(false)

    const prompt = vi.fn(async () => {})
    const event = Object.assign(new Event('beforeinstallprompt'), { prompt })
    window.dispatchEvent(event)
    expect(controller.snapshot().installable).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    await controller.install()
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(controller.snapshot().installable).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
    controller.stop()
  })

  it('install() is a no-op without a pending prompt', async () => {
    const media = new MediaStub()
    const controller = new InstallController(media)
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    await controller.install()
    expect(controller.snapshot().installable).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    controller.stop()
  })

  it('shows the iOS hint on an iPhone user agent outside standalone mode', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })
    const media = new MediaStub()
    media.matches = true
    const controller = new InstallController(media)
    controller.start()
    expect(controller.snapshot().iosHintVisible).toBe(true)
    controller.stop()
  })

  it('treats an iPad-impersonating desktop UA with touch as iOS', () => {
    Object.defineProperty(window, 'ontouchstart', { configurable: true, value: undefined })
    try {
      vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' })
      const media = new MediaStub()
      media.matches = true
      const controller = new InstallController(media)
      expect(controller.snapshot().iosHintVisible).toBe(true)
      controller.stop()
    } finally {
      delete (window as { ontouchstart?: unknown }).ontouchstart
    }
  })

  it('suppresses the hint in standalone (home-screen) launch modes', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', standalone: true })
    const controller = new InstallController()
    controller.start()
    expect(controller.snapshot().iosHintVisible).toBe(false)
    controller.stop()
  })

  it('suppresses the hint when matchMedia reports a standalone display mode', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const controller = new InstallController()
    expect(controller.snapshot().iosHintVisible).toBe(false)
    controller.stop()
  })

  it('respects a previously dismissed iOS hint (localStorage)', () => {
    localStorage.setItem('dsh-ui-mobile:ios-install-hint', '1')
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })
    const media = new MediaStub()
    media.matches = true
    const controller = new InstallController(media)
    expect(controller.snapshot().iosHintVisible).toBe(false)
    controller.stop()
  })

  it('dismissIosHint persists and flips the snapshot', () => {
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })
    const media = new MediaStub()
    media.matches = true
    const controller = new InstallController(media)
    const listener = vi.fn()
    controller.subscribe(listener)
    expect(controller.snapshot().iosHintVisible).toBe(true)
    controller.dismissIosHint()
    expect(controller.snapshot().iosHintVisible).toBe(false)
    expect(localStorage.getItem('dsh-ui-mobile:ios-install-hint')).toBe('1')
    expect(listener).toHaveBeenCalledTimes(1)
    controller.dismissIosHint() // already hidden → no notification
    expect(listener).toHaveBeenCalledTimes(1)
    controller.stop()
  })

  it('unsubscribe stops notifications', () => {
    const media = new MediaStub()
    const controller = new InstallController(media)
    controller.start()
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)
    unsubscribe()
    media.fire(true)
    expect(listener).not.toHaveBeenCalled()
    controller.stop()
  })

  it('stop() drops window listeners and clears the pending prompt', () => {
    const media = new MediaStub()
    const controller = new InstallController(media)
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    controller.stop()
    window.dispatchEvent(new Event('beforeinstallprompt'))
    media.fire(true)
    expect(listener).not.toHaveBeenCalled()
  })
})
