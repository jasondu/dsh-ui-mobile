// @vitest-environment jsdom
/** Left-edge sidebar gesture behavior. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EDGE_SWIPE_MAX_VERTICAL_DRIFT, EDGE_SWIPE_OPEN_DISTANCE, EDGE_SWIPE_START_WIDTH, EdgeSwipeController,
} from '../src/client/edge-swipe.ts'
import type { MobileNavState } from '../src/client/frame.ts'

let state: MobileNavState = { mobile: true, sidebarOpen: false, detailsOpen: false }

/** Dispatch one synthetic touch event with the coordinates the recognizer reads. */
function touch(type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', x: number, y = 100, count = 1): void {
  const event = new Event(type)
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
  })
  window.dispatchEvent(event)
}

function start(): { openSidebar: ReturnType<typeof vi.fn>; controller: EdgeSwipeController } {
  const openSidebar = vi.fn()
  const controller = new EdgeSwipeController({ snapshot: () => state }, openSidebar)
  controller.start()
  return { openSidebar, controller }
}

afterEach(() => {
  state = { mobile: true, sidebarOpen: false, detailsOpen: false }
  vi.restoreAllMocks()
})

describe('EdgeSwipeController', () => {
  it('opens after a rightward swipe beginning inside the left edge strip', () => {
    const { controller, openSidebar } = start()
    touch('touchstart', EDGE_SWIPE_START_WIDTH)
    touch('touchmove', EDGE_SWIPE_START_WIDTH + EDGE_SWIPE_OPEN_DISTANCE)
    expect(openSidebar).toHaveBeenCalledOnce()
    controller.stop()
  })

  it('leaves normal scrolling and non-edge gestures alone', () => {
    const { controller, openSidebar } = start()
    touch('touchstart', EDGE_SWIPE_START_WIDTH + 1)
    touch('touchmove', 120)
    touch('touchstart', 0)
    touch('touchmove', EDGE_SWIPE_OPEN_DISTANCE, 100 + EDGE_SWIPE_MAX_VERTICAL_DRIFT + 1)
    expect(openSidebar).not.toHaveBeenCalled()
    controller.stop()
  })

  it('ignores desktop, an open sidebar, multi-touch, and teardown', () => {
    const { controller, openSidebar } = start()
    state.mobile = false
    touch('touchstart', 0)
    touch('touchmove', EDGE_SWIPE_OPEN_DISTANCE)
    state.mobile = true
    state.sidebarOpen = true
    touch('touchstart', 0)
    touch('touchmove', EDGE_SWIPE_OPEN_DISTANCE)
    state.sidebarOpen = false
    touch('touchstart', 0, 100, 2)
    touch('touchmove', EDGE_SWIPE_OPEN_DISTANCE)
    controller.stop()
    touch('touchstart', 0)
    touch('touchmove', EDGE_SWIPE_OPEN_DISTANCE)
    expect(openSidebar).not.toHaveBeenCalled()
  })
})
