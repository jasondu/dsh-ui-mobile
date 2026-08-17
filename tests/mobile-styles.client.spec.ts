/**
 * ui-mobile responsive-sheet contract, asserted against the CSS text on disk:
 * the composer stays anchored when the transcript overscrolls — the scroller
 * cuts the overscroll chain, the seat moves to fixed docked at the screen
 * bottom (immune to iOS rubber-banding), the scroller reserves the seat's
 * live height, and the stacking order keeps the drawer scrim above the seat.
 * All of it must live inside the phone-tier media query so desktop layout is
 * untouched.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const MOBILE_CSS = readFileSync(fileURLToPath(new URL('../src/client/mobile.module.css', import.meta.url)), 'utf8')
const SCRIM_CSS = readFileSync(fileURLToPath(new URL('../src/client/DrawerScrim.module.css', import.meta.url)), 'utf8')
const BANNER_CSS = readFileSync(fileURLToPath(new URL('../src/client/InstallBanner.module.css', import.meta.url)), 'utf8')
const MENU_CSS = readFileSync(fileURLToPath(new URL('../src/client/HeaderMenuButton.module.css', import.meta.url)), 'utf8')
const NEW_SESSION_MENU_CSS = readFileSync(fileURLToPath(new URL('../src/client/NewSessionMenuButton.module.css', import.meta.url)), 'utf8')

/** Everything between the phone-tier media query opener and the end of the file. */
const phoneTier = MOBILE_CSS.slice(MOBILE_CSS.indexOf('@media (max-width: 767px)'))

describe('mobile.module.css overscroll contract', () => {
  it('cuts the transcript scroller\'s overscroll chain inside the phone tier', () => {
    expect(phoneTier).toContain('[data-mobile-role=\'center\'] [data-conversation-scroll]')
    expect(phoneTier).toContain('overscroll-behavior-y: contain')
  })

  it('docks the composer seat to the screen bottom inside the phone tier only', () => {
    expect(phoneTier).toContain('[data-mobile-role=\'center\'] [data-composer-seat]')
    // !important is load-bearing on every declared property: ui-conversation's
    // `.root[data-phase='active'] .composerSeat` (0,3,0) outranks this selector
    // (0,2,0) with position: sticky, bottom: 0, z-index: 7 — without the flags
    // the seat stays sticky and the fix silently no-ops.
    expect(phoneTier).toContain('position: fixed !important')
    expect(phoneTier).toContain('left: 0')
    expect(phoneTier).toContain('right: 0')
    expect(phoneTier).toContain('bottom: 0 !important')
    // The fix must not leak outside the phone tier (desktop keeps the
    // sticky composer from ui-conversation).
    expect(MOBILE_CSS.slice(0, MOBILE_CSS.indexOf('@media (max-width: 767px)'))).not.toContain('position: fixed')
  })

  it('reserves the seat height so the last message is not hidden behind the input', () => {
    expect(phoneTier).toContain('padding-bottom: var(--dsh-composer-height, 152px)')
  })

  it('stacks the scrim (35) above the seat (31); the install banner sits at top right', () => {
    expect(phoneTier).toContain('z-index: 31 !important')
    expect(SCRIM_CSS).toContain('z-index: 35') // the drawer scrim
    expect(BANNER_CSS).toContain('z-index: 2147483647') // above the composer
    expect(BANNER_CSS).toContain('top: calc(env(safe-area-inset-top) + 12px)')
    expect(BANNER_CSS).toContain('right: 12px')
  })

  it('keeps the header menu toggle icon-only and phone-tier-only', () => {
    expect(MENU_CSS).toContain('@media (min-width: 768px)')
    expect(MENU_CSS).toContain('display: none')
  })

  it('keeps the new-session menu below the opened sidebar drawer', () => {
    expect(NEW_SESSION_MENU_CSS).toContain('z-index: 39')
    expect(phoneTier).toContain('z-index: 40')
  })

  it('uses a compact sidebar drawer width on phones', () => {
    expect(phoneTier).toContain('width: min(78vw, 300px)')
  })

  it('hides session-log download and places access mode at the phone toolbar edge', () => {
    expect(phoneTier).toContain('[data-session-log-download]')
    expect(phoneTier).toContain('display: none')
    expect(phoneTier).toContain('[data-composer-tools]')
    expect(phoneTier).toContain('[data-composer-modes]')
    expect(phoneTier).toContain('[data-composer-trailing]')
    expect(phoneTier).toContain('display: contents')
    expect(phoneTier).toContain('[data-input-access-mode]')
    expect(phoneTier).toContain('order: 1')
    expect(phoneTier).toContain('margin-left: auto')
  })
})
