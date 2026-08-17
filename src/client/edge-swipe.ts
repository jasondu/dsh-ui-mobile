/**
 * Phone-tier left-edge gesture that opens the collapsed sidebar drawer.
 *
 * The recognizer watches the window instead of the drawer so the gesture is
 * available before the off-canvas sidebar has entered the hit-test tree. It
 * claims nothing from the browser: a vertical movement is ignored, preserving
 * normal transcript scrolling and browser navigation gestures.
 */
import type { MobileNavState } from './frame.ts'

/** Width of the left-edge activation strip, in CSS pixels. */
export const EDGE_SWIPE_START_WIDTH = 24
/** Rightward travel that opens the drawer, in CSS pixels. */
export const EDGE_SWIPE_OPEN_DISTANCE = 56
/** Largest vertical drift allowed while recognizing the horizontal gesture. */
export const EDGE_SWIPE_MAX_VERTICAL_DRIFT = 32

/** Read-only state source shared with the frame controller. */
export interface MobileStateSource {
  /** Latest responsive frame state. */
  snapshot(): MobileNavState
}

/** Callback invoked when a recognized gesture should reveal the sidebar. */
export type OpenSidebar = () => void

/** Recognize a rightward swipe that starts at the phone screen's left edge. */
export class EdgeSwipeController {
  private active = false
  private opened = false
  private startX = 0
  private startY = 0

  private readonly onStart = (event: TouchEvent): void => {
    const touch = event.touches[0]
    const state = this.state.snapshot()
    this.active = touch !== undefined
      && event.touches.length === 1
      && state.mobile
      && !state.sidebarOpen
      && touch.clientX <= EDGE_SWIPE_START_WIDTH
    this.opened = false
    if (!this.active || touch === undefined) return
    this.startX = touch.clientX
    this.startY = touch.clientY
  }

  private readonly onMove = (event: TouchEvent): void => {
    if (!this.active || this.opened || event.touches.length !== 1) return
    const touch = event.touches[0]
    if (touch === undefined) return
    const deltaX = touch.clientX - this.startX
    const deltaY = Math.abs(touch.clientY - this.startY)
    if (deltaY > EDGE_SWIPE_MAX_VERTICAL_DRIFT || deltaX < 0) {
      this.active = false
      return
    }
    if (deltaX < EDGE_SWIPE_OPEN_DISTANCE) return
    this.opened = true
    this.active = false
    this.openSidebar()
  }

  private readonly onEnd = (): void => { this.active = false }

  /**
   * @param state - source of phone-tier and drawer state.
   * @param openSidebar - delegates the open action to ui-layout.
   */
  constructor(private readonly state: MobileStateSource, private readonly openSidebar: OpenSidebar) {}

  /** Begin window-level gesture observation. */
  start(): void {
    window.addEventListener('touchstart', this.onStart, { passive: true })
    window.addEventListener('touchmove', this.onMove, { passive: true })
    window.addEventListener('touchend', this.onEnd, { passive: true })
    window.addEventListener('touchcancel', this.onEnd, { passive: true })
  }

  /** Stop observation and discard any partial gesture. */
  stop(): void {
    window.removeEventListener('touchstart', this.onStart)
    window.removeEventListener('touchmove', this.onMove)
    window.removeEventListener('touchend', this.onEnd)
    window.removeEventListener('touchcancel', this.onEnd)
    this.active = false
    this.opened = false
  }
}
