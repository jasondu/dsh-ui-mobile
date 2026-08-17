/**
 * Mobile keyboard action hint for the resident conversation textarea. The
 * host already treats ordinary Enter as submit; this plugin patch changes the
 * iOS/Android keyboard affordance from a newline to "Send" without taking
 * over the host's IME, queue, or duplicate-send safeguards.
 */
import { MOBILE_QUERY } from './frame.ts'

const COMPOSER_TEXTAREA = 'textarea[data-phase]'

/** Mark a composer textarea so virtual keyboards advertise the send action. */
export function markMobileComposerSendAction(node: Node): void {
  if (!(node instanceof HTMLTextAreaElement) || !node.matches(COMPOSER_TEXTAREA)) return
  node.setAttribute('enterkeyhint', 'send')
  node.enterKeyHint = 'send'
}

/** Install the phone-only keyboard-action presenter. */
export function enableMobileEnterSend(): () => void {
  if (typeof window.matchMedia !== 'function' || !window.matchMedia(MOBILE_QUERY).matches) return () => {}
  for (const textarea of document.querySelectorAll<HTMLTextAreaElement>(COMPOSER_TEXTAREA)) {
    markMobileComposerSendAction(textarea)
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLTextAreaElement) markMobileComposerSendAction(node)
        else if (node instanceof Element) {
          for (const textarea of node.querySelectorAll<HTMLTextAreaElement>(COMPOSER_TEXTAREA)) {
            markMobileComposerSendAction(textarea)
          }
        }
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}
