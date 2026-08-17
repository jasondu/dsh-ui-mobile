/**
 * Install controller: the PWA install-promotion half of the mobile plugin.
 *
 * Owns the install-prompt lifecycle (Chrome/Edge Android's
 * `beforeinstallprompt`), the iOS "add to home screen" hint, and the
 * phone-tier flag — one reactive snapshot the install banner renders from.
 * It never touches the DOM beyond window event listeners and localStorage;
 * like MobileFrameController it owns no DOM state.
 */

/** Phone-tier media query, shared with the frame controller. */
const MOBILE_QUERY = '(max-width: 767px)'

/** Legacy localStorage key used by previous iOS-only install guidance. */
const IOS_HINT_KEY = 'dsh-ui-mobile:ios-install-hint'

/** localStorage key remembering that the user dismissed install promotion. */
const INSTALL_PROMOTION_DISMISSED_KEY = 'dsh-ui-mobile:install-promotion-dismissed'

/** The prompt object Chrome/Edge hands to `beforeinstallprompt` listeners. */
export interface InstallPromptLike {
  /** Show the browser's install UI. */
  prompt(): Promise<void>
}

/** Reactive install state (see per-field docs). */
export interface InstallState {
  /** True at phone tier. */
  mobile: boolean
  /** True while the browser offers install (Chrome/Edge Android, `beforeinstallprompt` pending). */
  installable: boolean
  /** True on iOS Safari outside standalone mode when the hint has not been dismissed yet. */
  iosHintVisible: boolean
}

/** Minimal media-list surface (jsdom lacks matchMedia). */
interface MediaListLike {
  matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

/** Static media fallback for environments without matchMedia. */
const STATIC_MEDIA: MediaListLike = {
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}

/** Evaluate a media query safely (browsers only). */
function matches(query: string): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/** True when the app is already launched from the home screen (no browser chrome). */
function isStandalone(): boolean {
  const navigatorLike = navigator as Navigator & { standalone?: boolean }
  return navigatorLike.standalone === true
    || matches('(display-mode: standalone)')
    || matches('(display-mode: fullscreen)')
}

/** True on iOS Safari (the only browser that needs a manual add-to-home-screen hint). */
function isIOSBrowser(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua)
    || (ua.includes('Macintosh') && 'ontouchstart' in window)
}

/**
 * Own the install-prompt lifecycle and publish {@link InstallState}
 * snapshots. `start()` arms the phone-tier media query and the
 * `beforeinstallprompt` listener; `stop()` tears both down.
 */
export class InstallController {
  private readonly listeners = new Set<() => void>()
  private readonly media: MediaListLike
  private readonly onMedia = (): void => { this.setState({ mobile: this.media.matches }) }
  private readonly onPrompt = (event: Event): void => {
    if (this.isPromotionDismissed()) return
    this.promptEvent = event as unknown as InstallPromptLike
    this.setState({ installable: true })
  }
  private promptEvent: InstallPromptLike | null = null
  private state: InstallState = { mobile: false, installable: false, iosHintVisible: false }

  /**
   * @param media - phone-tier media list override (tests); defaults to the window query.
   */
  constructor(media: MediaListLike = (typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY)
    : STATIC_MEDIA)) {
    this.media = media
    this.state = {
      mobile: media.matches,
      installable: false,
      iosHintVisible: !isStandalone() && isIOSBrowser() && !this.isPromotionDismissed(),
    }
  }

  /** Current snapshot (stable object between changes). */
  snapshot(): InstallState {
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

  /** Start listening. Callers guard their own lifecycle (ctx.effect). */
  start(): void {
    this.media.addEventListener('change', this.onMedia)
    window.addEventListener('beforeinstallprompt', this.onPrompt)
  }

  /** Stop listening and drop listeners. */
  stop(): void {
    this.media.removeEventListener('change', this.onMedia)
    window.removeEventListener('beforeinstallprompt', this.onPrompt)
    this.promptEvent = null
    this.listeners.clear()
  }

  /** Run the browser's install UI for the pending prompt, then clear it. */
  async install(): Promise<void> {
    const prompt = this.promptEvent
    if (prompt === null) return
    this.promptEvent = null
    await prompt.prompt()
    this.setState({ installable: false })
  }

  /** Permanently dismiss install promotion in this browser (localStorage-backed). */
  dismissInstallPromotion(): void {
    localStorage.setItem(INSTALL_PROMOTION_DISMISSED_KEY, '1')
    this.promptEvent = null
    this.setState({ installable: false, iosHintVisible: false })
  }

  /** Honor the former iOS-only key so existing dismissals stay dismissed. */
  private isPromotionDismissed(): boolean {
    return localStorage.getItem(INSTALL_PROMOTION_DISMISSED_KEY) === '1'
      || localStorage.getItem(IOS_HINT_KEY) === '1'
  }

  /** Publish a new snapshot only when something changed. */
  private setState(next: Partial<InstallState>): void {
    const prev = this.state
    const merged: InstallState = { ...prev, ...next }
    if (
      merged.mobile === prev.mobile
      && merged.installable === prev.installable
      && merged.iosHintVisible === prev.iosHintVisible
    ) return
    this.state = merged
    for (const listener of this.listeners) listener()
  }
}
