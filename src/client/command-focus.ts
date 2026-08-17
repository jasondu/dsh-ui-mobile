/**
 * Command-panel keyboard guard: a plugin-level patch that stops the command
 * select panel (`PopupSelectView` in ui-commands) from popping the on-screen
 * keyboard when it opens on phones.
 *
 * The panel auto-focuses its search input via script (`searchRef.focus()`),
 * which opens the keyboard the moment the panel appears — a poor mobile
 * experience. The upstream fix belongs in ui-commands; this guard makes any
 * deployment that installs this plugin behave correctly even before that
 * fix lands, by blurring script-driven focus into the panel's search field.
 *
 * Signals: a script `.focus()` produces a `focusin` event with
 * `isTrusted === false` (user taps are trusted), and the panel's search
 * input is an `<input>` inside the composer card (`[data-composer-card]`) —
 * the main composer is a `<textarea>` and is never touched. Phone tier only:
 * desktop keeps the open-and-type combobox behavior. jsdom has no
 * matchMedia, so tests and non-phone environments install nothing.
 */

const MOBILE_QUERY = '(max-width: 767px)'

/** The composer card wrapper that hosts the command panel's search input. */
const COMPOSER_CARD = '[data-composer-card]'

/** The minimal focus event surface the guard reads. */
export interface FocusLike {
  isTrusted: boolean
  target: EventTarget | null
}

/**
 * Decide whether a focus event is the command panel's script-driven search
 * focus (blur it) rather than a user tap or another field. Pure, so the
 * trusted/untargeted branches are directly testable.
 */
export function shouldSuppressCommandFocus(event: FocusLike): boolean {
  if (event.isTrusted) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName !== 'INPUT') return false
  return target.closest(COMPOSER_CARD) !== null
}

/**
 * Install the guard while the viewport is at phone tier.
 * @returns disposer removing the listener (no-op outside the phone tier).
 */
export function suppressCommandPanelScriptFocus(): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  if (!window.matchMedia(MOBILE_QUERY).matches) return () => {}

  const onFocusIn = (event: FocusEvent): void => {
    if (!shouldSuppressCommandFocus(event)) return
    // Blur before the platform schedules the keyboard: a synchronous blur
    // after a scripted focus() prevents the on-screen keyboard from opening.
    ;(event.target as HTMLElement).blur()
  }
  document.addEventListener('focusin', onFocusIn, true)
  return () => document.removeEventListener('focusin', onFocusIn, true)
}
