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
    // !important is load-bearing on every declared property: ui-conversation's
    // `.root[data-phase='active'] .composerSeat` (0,3,0) outranks this selector
    // (0,2,0) with position: sticky, bottom: 0, z-index: 7 — without the flags
    // the seat lands at bottom: 0 under the nav bar, which covers the input.
    expect(phoneTier).toContain('position: fixed !important')
    expect(phoneTier).toContain('left: 0')
    expect(phoneTier).toContain('right: 0')
    expect(phoneTier).toContain('bottom: var(--dsh-mobile-nav-height) !important')
    // The fix must not leak outside the phone tier (desktop keeps the
    // sticky composer from ui-conversation).
    expect(MOBILE_CSS.slice(0, MOBILE_CSS.indexOf('@media (max-width: 767px)'))).not.toContain('position: fixed')
  })

  it('defines the compact nav-bar height once and reuses it everywhere', () => {
    // Single source of truth: the bar is 48px + safe-area, and the reserved
    // center strip, the fixed composer seat, and the install banner all dock
    // off the same variable so they cannot drift apart.
    expect(phoneTier).toContain('--dsh-mobile-nav-height: calc(48px + env(safe-area-inset-bottom))')
    expect(phoneTier).toContain('padding-bottom: var(--dsh-mobile-nav-height)')
    expect(BANNER_CSS).toContain('bottom: calc(var(--dsh-mobile-nav-height) + 10px)')
    // The bar's own padding+button sum matches the variable (4 + 40 + 4).
    expect(NAV_CSS).toContain('min-height: 40px')
    expect(NAV_CSS).toContain('padding: 4px 12px calc(4px + env(safe-area-inset-bottom))')
  })

  it('reserves the seat height so the last message is not hidden behind the input', () => {
    expect(phoneTier).toContain('padding-bottom: var(--dsh-composer-height, 152px)')
  })

  it('stacks the seat (31) above the nav bar (30) and below the scrim (35)', () => {
    expect(phoneTier).toContain('z-index: 31 !important')
    expect(NAV_CSS).toContain('z-index: 30') // the bottom nav bar
    expect(NAV_CSS).toContain('z-index: 35') // the drawer scrim
    expect(BANNER_CSS).toContain('z-index: 28') // the PWA install banner
  })
})
