// @vitest-environment jsdom
/**
 * ui-mobile browser half: registerServiceWorker — best-effort registration on
 * window load, silent without service worker support or on failure.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from '../src/client/sw.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Each test gets an isolated window stub that records `load` listeners, so
 * listeners from earlier tests cannot fire into a later test's mocks.
 */
function makeWindowStub(): { fireLoad(): void } {
  const loadHandlers: Array<() => void> = []
  vi.stubGlobal('window', {
    addEventListener: (type: string, handler: () => void): void => {
      if (type === 'load') loadHandlers.push(handler)
    },
  })
  return {
    fireLoad(): void {
      for (const handler of loadHandlers.splice(0)) handler()
    },
  }
}

describe('registerServiceWorker', () => {
  it('registers /sw.js after window load when supported', async () => {
    const register = vi.fn(async () => ({}))
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
    const windowStub = makeWindowStub()
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled() // waits for load
    windowStub.fireLoad()
    await Promise.resolve()
    expect(register).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('swallows registration failures', async () => {
    const register = vi.fn(async () => { throw new Error('no secure context') })
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
    const windowStub = makeWindowStub()
    registerServiceWorker()
    windowStub.fireLoad()
    // Must not throw: the UI has no dependency on the cache working.
    await Promise.resolve()
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('does nothing without service worker support (jsdom default)', () => {
    makeWindowStub()
    registerServiceWorker()
    // jsdom's navigator has no serviceWorker — reaching here without a crash
    // is the contract; there is no listener to fire.
    expect(true).toBe(true)
  })

  it('does nothing when navigator itself is absent', () => {
    vi.stubGlobal('navigator', undefined)
    makeWindowStub()
    expect(() => registerServiceWorker()).not.toThrow()
  })
})
