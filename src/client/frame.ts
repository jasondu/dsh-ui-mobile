/**
 * Mobile-frame controller: the browser-side half of the responsive shell.
 *
 * The AppFrame's column classes are CSS-module hashed, so another plugin can
 * never reach them by class name. This controller instead stamps stable data
 * attributes on the assembled frame once it appears in the DOM — found through
 * the frame's own `data-shell-overlay` child — and mirrors the frame's
 * collapse state (`data-sidebar-collapsed` / `data-details-collapsed`) plus
 * the viewport tier (`matchMedia`) into one reactive snapshot the mobile nav
 * bar renders from. It owns no DOM state: the frame and its attributes belong
 * to ui-layout, and the controller only reads them.
 */

/** Phone-tier media query: below this width the shell restructures into drawers. */
export const MOBILE_QUERY = '(max-width: 767px)'

/** Reactive mobile view state (see per-field docs). */
export interface MobileNavState {
  /** True when the viewport is at phone tier (MOBILE_QUERY matches). */
  mobile: boolean
  /** True when the sidebar drawer is expanded (frame lacks `data-sidebar-collapsed`). */
  sidebarOpen: boolean
  /** True when the details drawer is expanded (frame lacks `data-details-collapsed`). */
  detailsOpen: boolean
}

/** Stable column roles stamped onto the frame's grid children, in DOM order. */
export const COLUMN_ROLES = ['sidebar', 'center', 'details'] as const

/** Column role attribute value (`data-mobile-role`). */
export type ColumnRole = (typeof COLUMN_ROLES)[number]

/** The overlay layer the frame always renders; its parent element is the frame. */
const OVERLAY_SELECTOR = '[data-shell-overlay]'

/** The overlay layer's stable attribute (also the stamping stop marker). */
const OVERLAY_ATTRIBUTE = 'data-shell-overlay'

/** Frame attributes that flip when a drawer opens or closes. */
const COLLAPSE_ATTRIBUTES = ['data-sidebar-collapsed', 'data-details-collapsed'] as const

/** Minimal media-list surface the controller needs. */
export interface MediaListLike {
  matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

/**
 * Resolve the phone-tier media list for the current window. jsdom (and any
 * other embedder without the API) lacks `window.matchMedia`; the controller
 * then stays at desktop behavior, which is the safe default for a test
 * environment and has no effect on real browsers.
 */
function createMediaList(): MediaListLike {
  const matchMedia = window.matchMedia
  if (typeof matchMedia === 'function') return matchMedia(MOBILE_QUERY)
  return {
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}

/**
 * Observe the assembled shell frame and publish {@link MobileNavState}
 * snapshots. `start()` mounts two observers: a body-level watcher that (re-)
 * attaches when the frame appears or is replaced (plugin reload), and a
 * frame-level watcher for collapse-attribute flips. `stop()` tears both down.
 */
export class MobileFrameController {
  private readonly listeners = new Set<() => void>()
  private readonly media: MediaListLike
  private readonly onMedia = (): void => { this.setState({ mobile: this.media.matches }) }
  private readonly onBody = (): void => {
    this.attach()
    this.stampPhoneControls()
  }
  private readonly onFrame = (): void => { this.read() }
  private frame: HTMLElement | null = null
  private bodyObserver: MutationObserver | null = null
  private frameObserver: MutationObserver | null = null
  private state: MobileNavState = { mobile: false, sidebarOpen: false, detailsOpen: false }

  /**
   * @param media - media list override (tests); defaults to the window's phone-tier query.
   */
  constructor(media: MediaListLike = createMediaList()) {
    this.media = media
  }

  /** Current snapshot (stable object between changes). */
  snapshot(): MobileNavState {
    return this.state
  }

  /**
   * Subscribe to state changes.
   * @param listener - called after every snapshot change.
   * @returns unsubscriber.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Start observing. Idempotent-friendly: callers guard with their own lifecycle. */
  start(): void {
    this.state = { ...this.state, mobile: this.media.matches }
    this.media.addEventListener('change', this.onMedia)
    this.bodyObserver = new MutationObserver(this.onBody)
    this.bodyObserver.observe(document.body, { childList: true, subtree: true })
    this.attach()
    this.stampPhoneControls()
  }

  /** Stop observing and drop listeners. */
  stop(): void {
    this.media.removeEventListener('change', this.onMedia)
    this.bodyObserver?.disconnect()
    this.bodyObserver = null
    this.frameObserver?.disconnect()
    this.frameObserver = null
    this.frame = null
    this.listeners.clear()
  }

  /**
   * Locate the frame (parent of the overlay layer) and, when it is new, stamp
   * the stable attributes and start the collapse observer.
   */
  private attach(): void {
    const overlay = document.querySelector(OVERLAY_SELECTOR)
    const frame = overlay?.parentElement ?? null
    if (frame === null || frame === this.frame) return
    this.frame = frame
    frame.dataset.mobileFrame = ''
    for (const [index, role] of COLUMN_ROLES.entries()) {
      const column = frame.children[index] as HTMLElement | undefined
      // Defensive: the frame is discovered through its overlay child, so the
      // overlay (and every later sibling) is always a child — this arm only
      // fires on a frame with no columns at all.
      /* v8 ignore next 2 -- truncated frame without any column before the overlay */
      if (column === undefined) break
      // Stop at the overlay: a truncated frame must not stamp a later sibling.
      if (column.hasAttribute(OVERLAY_ATTRIBUTE)) break
      column.dataset.mobileRole = role
    }
    this.frameObserver?.disconnect()
    this.frameObserver = new MutationObserver(this.onFrame)
    this.frameObserver.observe(frame, {
      attributes: true,
      attributeFilter: [...COLLAPSE_ATTRIBUTES],
    })
    this.read()
  }

  /**
   * Mark the two low-frequency phone controls which older hosts do not expose
   * with plugin-stable attributes. The names and nesting are public UI
   * behavior: `Menu` wraps the access-mode button in a span, inside its modes
   * group, tools group, and finally the composer toolbar. Marking this
   * structure lets the responsive sheet reflow it without reaching hashed
   * CSS-module classes. Newer hosts already expose the same attributes.
   */
  private stampPhoneControls(): void {
    const sessionLog = [...document.querySelectorAll<HTMLButtonElement>('button[aria-busy]')]
      .find(button => button.textContent?.trim() === 'Session log')
    sessionLog?.setAttribute('data-session-log-download', '')

    const accessMode = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label]')]
      .find(button => {
        const label = button.getAttribute('aria-label') ?? ''
        return label.startsWith('Access mode') || label.startsWith('访问模式')
      })
    if (accessMode === undefined) return
    accessMode.setAttribute('data-input-access-mode', '')
    const modes = accessMode.parentElement?.parentElement
    const tools = modes?.parentElement
    const toolbar = tools?.parentElement
    const trailing = toolbar?.lastElementChild
    if (modes === null || tools === null || toolbar === null || trailing === null || trailing === undefined || trailing === tools) return
    modes.setAttribute('data-composer-modes', '')
    tools.setAttribute('data-composer-tools', '')
    toolbar.setAttribute('data-composer-toolbar', '')
    trailing.setAttribute('data-composer-trailing', '')
  }

  /** Mirror the frame's collapse attributes into the snapshot. */
  private read(): void {
    const frame = this.frame
    /* v8 ignore next 3 -- defensive arm: read() is only reachable from attach()
     * (which just assigned frame) or the frame observer (only mounted while a
     * frame is assigned); disconnect() drops queued observer records. */
    if (frame === null) return
    this.setState({
      sidebarOpen: !frame.hasAttribute('data-sidebar-collapsed'),
      detailsOpen: !frame.hasAttribute('data-details-collapsed'),
    })
  }

  /** Publish a new snapshot only when something changed. */
  private setState(next: Partial<MobileNavState>): void {
    const prev = this.state
    const merged: MobileNavState = { ...prev, ...next }
    if (
      merged.mobile === prev.mobile
      && merged.sidebarOpen === prev.sidebarOpen
      && merged.detailsOpen === prev.detailsOpen
    ) return
    this.state = merged
    for (const listener of this.listeners) listener()
  }
}
