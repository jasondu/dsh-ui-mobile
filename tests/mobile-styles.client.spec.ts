/**
 * ui-mobile responsive-sheet contract, asserted against the CSS text on disk:
 * the composer stays anchored when the transcript overscrolls — the scroller
 * cuts the overscroll chain, the seat moves to fixed (immune to iOS
 * rubber-banding), the scroller reserves the seat's live height, and the
 * stacking order keeps the nav bar and scrim above the seat. All of it must
 * live inside the phone-tier media query so desktop layout is untouched.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const MOBILE_CSS = readFileSync(fileURLToPath(new URL('../src/client/mobile.module.css', import.meta.url)), 'utf8')
const NAV_CSS = readFileSync(fileURLToPath(new URL('../src/client/MobileNav.module.css', import.meta.url)), 'utf8')
const BANNER_CSS = readFileSync(fileURLToPath(new URL('../src/client/InstallBanner.module.css', import.meta.url)), 'utf8')

/** Everything between the phone-tier media query opener and the end of the file. */
const phoneTier = MOBILE_CSS.slice(MOBILE_CSS.indexOf('@media (max-width: 767px)'))

describe('mobile.module.css overscroll contract', () => {
  it('cuts the transcript scroller\'s overscroll chain inside the phone tier', () => {
    expect(phoneTier).toContain('[data-mobile-role=\'center\'] [data-conversation-scroll]')
    expect(phoneTier).toContain('overscroll-behavior-y: contain')
  })

  it('moves the composer seat to fixed inside the phone tier only', () => {
    expect(phoneTier).toContain('[data-mobile-role=\'center\'] [data-composer-seat]')
    expect(phoneTier).toContain('position: fixed')
    expect(phoneTier).toContain('left: 0')
    expect(phoneTier).toContain('right: 0')
    expect(phoneTier).toContain('bottom: calc(64px + env(safe-area-inset-bottom))')
    // The fix must not leak outside the phone tier (desktop keeps the
    // sticky composer from ui-conversation).
    expect(MOBILE_CSS.slice(0, MOBILE_CSS.indexOf('@media (max-width: 767px)'))).not.toContain('position: fixed')
  })

  it('reserves the seat height so the last message is not hidden behind the input', () => {
    expect(phoneTier).toContain('padding-bottom: var(--dsh-composer-height, 152px)')
  })

  it('keeps the nav bar (30), install banner (28), and drawer scrim (35) above the seat (27)', () => {
    expect(phoneTier).toContain('z-index: 27')
    expect(NAV_CSS).toContain('z-index: 30') // the bottom nav bar
    expect(NAV_CSS).toContain('z-index: 35') // the drawer scrim
    expect(BANNER_CSS).toContain('z-index: 28') // the PWA install banner
  })
})
