// @vitest-environment jsdom
/**
 * ui-mobile browser half: the MobileFrameController contract — locating and
 * stamping the assembled AppFrame, mirroring its collapse attributes and the
 * phone-tier media query, and publishing reactive snapshots.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COLUMN_ROLES, MobileFrameController, MOBILE_QUERY, type MediaListLike, type MobileNavState,
} from '../src/client/frame.ts'

/** Flush MutationObserver microtask delivery in jsdom. */
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

class MediaStub implements MediaListLike {
  matches = false
  private readonly listeners = new Set<() => void>()

  addEventListener(_type: 'change', listener: () => void): void { this.listeners.add(listener) }

  removeEventListener(_type: 'change', listener: () => void): void { this.listeners.delete(listener) }

  fire(matches: boolean): void {
    this.matches = matches
    for (const listener of this.listeners) listener()
  }
}

/** Build an AppFrame-shaped fixture: three columns plus the overlay layer. */
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

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('MobileFrameController', () => {
  it('falls back to desktop behavior when matchMedia is missing', () => {
    const controller = new MobileFrameController()
    controller.start()
    expect(controller.snapshot()).toEqual<MobileNavState>({ mobile: false, sidebarOpen: false, detailsOpen: false })
    controller.stop()
  })

  it('resolves the phone-tier query through the real matchMedia when present', () => {
    const media = new MediaStub()
    media.matches = true
    const matchMedia = vi.fn(() => media)
    vi.stubGlobal('matchMedia', matchMedia)
    const controller = new MobileFrameController()
    controller.start()
    expect(matchMedia).toHaveBeenCalledWith(MOBILE_QUERY)
    expect(controller.snapshot().mobile).toBe(true)
    controller.stop()
  })

  it('start() stamps the frame and columns and reads the initial collapse state', () => {
    const frame = mountFrame()
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    expect(frame.dataset.mobileFrame).toBe('')
    const [sidebar, center, details] = frame.children
    expect(sidebar!.getAttribute("data-mobile-role")).toBe("sidebar")
    expect(center!.getAttribute("data-mobile-role")).toBe("center")
    expect(details!.getAttribute("data-mobile-role")).toBe("details")
    expect(COLUMN_ROLES).toEqual(['sidebar', 'center', 'details'])
    expect(controller.snapshot()).toEqual<MobileNavState>({ mobile: false, sidebarOpen: false, detailsOpen: false })
    controller.stop()
  })

  it('stays inert until the frame appears, then attaches through the body observer', async () => {
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    expect(controller.snapshot().sidebarOpen).toBe(false)
    const frame = mountFrame()
    await flush()
    expect(frame.dataset.mobileFrame).toBe('')
    expect(controller.snapshot().sidebarOpen).toBe(false) // collapsed attribute present
    controller.stop()
  })

  it('skips missing columns instead of crashing on a truncated frame', () => {
    const frame = document.createElement('div')
    const overlay = document.createElement('div')
    overlay.setAttribute('data-shell-overlay', '')
    frame.append(document.createElement('div'), overlay) // only one column
    document.body.append(frame)
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    expect(frame.children[0]!.getAttribute("data-mobile-role")).toBe("sidebar")
    expect(frame.children[1]!.hasAttribute("data-mobile-role")).toBe(false)
    controller.stop()
  })

  it('re-attaches when the frame is replaced (plugin reload)', async () => {
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    const first = mountFrame()
    await flush()
    expect(first.dataset.mobileFrame).toBe('')
    first.remove()
    const second = mountFrame()
    await flush()
    expect(second.dataset.mobileFrame).toBe('')
    controller.stop()
  })

  it('mirrors collapse-attribute flips and notifies subscribers', async () => {
    const frame = mountFrame()
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    frame.removeAttribute('data-sidebar-collapsed')
    await flush()
    expect(controller.snapshot().sidebarOpen).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    frame.setAttribute('data-sidebar-collapsed', '')
    await flush()
    expect(controller.snapshot().sidebarOpen).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
    controller.stop()
  })

  it('mirrors media-query changes and notifies subscribers', () => {
    const media = new MediaStub()
    const controller = new MobileFrameController(media)
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    media.fire(true)
    expect(controller.snapshot().mobile).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    media.fire(false)
    expect(controller.snapshot().mobile).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
    controller.stop()
  })

  it('does not notify when a media fire does not change the snapshot', () => {
    const media = new MediaStub()
    const controller = new MobileFrameController(media)
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    media.fire(false) // already false
    expect(listener).not.toHaveBeenCalled()
    controller.stop()
  })

  it('unsubscribe stops notifications', () => {
    const media = new MediaStub()
    const controller = new MobileFrameController(media)
    controller.start()
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)
    unsubscribe()
    media.fire(true)
    expect(listener).not.toHaveBeenCalled()
    controller.stop()
  })

  it('stop() detaches observers and drops listeners', async () => {
    const frame = mountFrame()
    const controller = new MobileFrameController(new MediaStub())
    controller.start()
    const listener = vi.fn()
    controller.subscribe(listener)
    controller.stop()
    frame.removeAttribute('data-sidebar-collapsed')
    await flush()
    expect(listener).not.toHaveBeenCalled()
    // A fresh controller attaches to the same frame without stale state.
    const second = new MobileFrameController(new MediaStub())
    second.start()
    expect(frame.dataset.mobileFrame).toBe('')
    expect(second.snapshot().sidebarOpen).toBe(true)
    second.stop()
  })
})
