// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableMobileEnterSend, markMobileComposerSendAction } from '../src/client/mobile-enter-send.ts'

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('mobile keyboard send action', () => {
  it('marks only the conversation textarea as a send action', () => {
    const composer = document.createElement('textarea')
    composer.dataset.phase = 'ready'
    const other = document.createElement('textarea')
    markMobileComposerSendAction(composer)
    markMobileComposerSendAction(other)
    expect(composer.enterKeyHint).toBe('send')
    expect(other.getAttribute('enterkeyhint')).toBeNull()
  })

  it('marks existing and newly mounted composer textareas on phones', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const existing = document.createElement('textarea')
    existing.dataset.phase = 'ready'
    document.body.append(existing)
    const stop = enableMobileEnterSend()
    expect(existing.enterKeyHint).toBe('send')
    const mounted = document.createElement('textarea')
    mounted.dataset.phase = 'ready'
    document.body.append(mounted)
    await Promise.resolve()
    expect(mounted.enterKeyHint).toBe('send')
    stop()
  })

  it('does nothing outside phone tier', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const composer = document.createElement('textarea')
    composer.dataset.phase = 'ready'
    document.body.append(composer)
    enableMobileEnterSend()
    expect(composer.getAttribute('enterkeyhint')).toBeNull()
  })
})
