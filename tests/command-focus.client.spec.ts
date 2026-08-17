// @vitest-environment jsdom
/**
 * ui-mobile browser half: the command-panel keyboard guard — the pure
 * decision function (script-driven focus into the panel's search input is
 * suppressed; user taps, the composer textarea, other inputs, and non-phone
 * environments are left alone) plus the listener wiring.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  shouldSuppressCommandFocus, suppressCommandPanelScriptFocus, type FocusLike,
} from '../src/client/command-focus.ts'

/** A synthetic focusin (isTrusted=false) — jsdom events are always untrusted. */
function focusIn(target: HTMLElement): void {
  target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/** A focus-like with a controllable trusted flag. */
function focusLike(target: EventTarget | null, isTrusted: boolean): FocusLike {
  return { isTrusted, target }
}

function cardInput(): { card: HTMLElement; input: HTMLInputElement } {
  const card = document.createElement('div')
  card.setAttribute('data-composer-card', '')
  const input = document.createElement('input')
  card.append(input)
  document.body.append(card)
  return { card, input }
}

function stubPhoneTier(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('shouldSuppressCommandFocus', () => {
  it('suppresses an untrusted <input> focus inside the composer card', () => {
    const { input } = cardInput()
    expect(shouldSuppressCommandFocus(focusLike(input, false))).toBe(true)
  })

  it('allows trusted (user-driven) focus', () => {
    const { input } = cardInput()
    expect(shouldSuppressCommandFocus(focusLike(input, true))).toBe(false)
  })

  it('never suppresses the composer <textarea>', () => {
    const card = document.createElement('div')
    card.setAttribute('data-composer-card', '')
    const textarea = document.createElement('textarea')
    card.append(textarea)
    document.body.append(card)
    expect(shouldSuppressCommandFocus(focusLike(textarea, false))).toBe(false)
  })

  it('ignores inputs outside the composer card', () => {
    const input = document.createElement('input')
    document.body.append(input)
    expect(shouldSuppressCommandFocus(focusLike(input, false))).toBe(false)
  })

  it('ignores non-element targets', () => {
    expect(shouldSuppressCommandFocus(focusLike(null, false))).toBe(false)
  })
})

describe('suppressCommandPanelScriptFocus wiring', () => {
  it('blurs a script-focused search input at phone tier', () => {
    stubPhoneTier(true)
    const { input } = cardInput()
    const blur = vi.spyOn(input, 'blur')
    const dispose = suppressCommandPanelScriptFocus()
    try {
      focusIn(input)
      expect(blur).toHaveBeenCalledTimes(1)
    } finally {
      dispose()
    }
  })

  it('the listener lets non-suppressed focus (textarea) pass through', () => {
    stubPhoneTier(true)
    const card = document.createElement('div')
    card.setAttribute('data-composer-card', '')
    const textarea = document.createElement('textarea')
    card.append(textarea)
    document.body.append(card)
    const blur = vi.spyOn(textarea, 'blur')
    const dispose = suppressCommandPanelScriptFocus()
    try {
      focusIn(textarea)
      expect(blur).not.toHaveBeenCalled()
    } finally {
      dispose()
    }
  })

  it('installs nothing outside the phone tier', () => {
    stubPhoneTier(false)
    const { input } = cardInput()
    const blur = vi.spyOn(input, 'blur')
    const dispose = suppressCommandPanelScriptFocus()
    try {
      focusIn(input)
      expect(blur).not.toHaveBeenCalled()
    } finally {
      dispose()
    }
  })

  it('installs nothing without matchMedia (jsdom default, desktop tests)', () => {
    const { input } = cardInput()
    const blur = vi.spyOn(input, 'blur')
    const dispose = suppressCommandPanelScriptFocus()
    try {
      focusIn(input)
      expect(blur).not.toHaveBeenCalled()
    } finally {
      dispose()
    }
  })

  it('the disposer removes the listener', () => {
    stubPhoneTier(true)
    const { input } = cardInput()
    const blur = vi.spyOn(input, 'blur')
    const dispose = suppressCommandPanelScriptFocus()
    dispose()
    focusIn(input)
    expect(blur).not.toHaveBeenCalled()
  })
})
