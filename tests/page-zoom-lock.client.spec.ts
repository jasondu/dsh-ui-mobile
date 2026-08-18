// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lockMobilePageZoom } from '../src/client/page-zoom-lock.ts'

function touchMove(count: number): TouchEvent {
  const event = new Event('touchmove', { cancelable: true }) as TouchEvent
  Object.defineProperty(event, 'touches', { value: Array.from({ length: count }) })
  return event
}

afterEach(() => vi.unstubAllGlobals())

describe('mobile page zoom lock', () => {
  it('blocks WebKit gestures and multi-touch moves on phones', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const stop = lockMobilePageZoom()
    expect(document.dispatchEvent(new Event('gesturestart', { cancelable: true }))).toBe(false)
    expect(document.dispatchEvent(touchMove(2))).toBe(false)
    expect(document.dispatchEvent(touchMove(1))).toBe(true)
    stop()
  })

  it('does not alter gestures outside phone tier', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const stop = lockMobilePageZoom()
    expect(document.dispatchEvent(new Event('gesturestart', { cancelable: true }))).toBe(true)
    expect(document.dispatchEvent(touchMove(2))).toBe(true)
    stop()
  })
})
